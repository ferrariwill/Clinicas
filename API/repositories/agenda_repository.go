package repositories

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/utils"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrConflitoAgendamento indica sobreposição de horário para o mesmo profissional.
var ErrConflitoAgendamento = errors.New("conflito de horário: o profissional já possui agendamento neste intervalo")

// ErrCapacidadeAgendaExcedida indica que o limite de atendimentos simultâneos (max_pacientes) foi atingido.
var ErrCapacidadeAgendaExcedida = errors.New("limite de atendimentos simultâneos neste horário foi atingido para este profissional")

type AgendaReposiory interface {
	Criar(agenda models.Agenda, procedimentosExtras []uint) (models.Agenda, error)
	Listar(clinicaID uint, dia *time.Time, usuarioID *uint) ([]models.Agenda, error)
	AtualizarStatus(clinicaID, id, statusID, usuarioLancamentoID uint, pularReceitaAutomatica bool) error
	LiberarCobranca(clinicaID, agendaID uint) error
	AtualizarProfissionalAgenda(clinicaID, agendaID, novoUsuarioID uint) error
	HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time, duracaoTotalMin uint) ([]time.Time, error)
	BuscarPorIDClinica(id, clinicaID uint) (*models.Agenda, error)
	StatusIDPorNome(nome string) (uint, error)
}

type agendaRepository struct {
	db *gorm.DB
}

func NovaAgendaRepository(db *gorm.DB) AgendaReposiory {
	return &agendaRepository{db: db}
}

func duracaoProcedimentoEmTx(tx *gorm.DB, clinicaID, procID uint) int {
	var proc models.Procedimento
	if err := tx.Where("id = ? AND clinica_id = ?", procID, clinicaID).First(&proc).Error; err != nil {
		return 30
	}
	d := proc.Duracao
	if d <= 0 {
		var cfg models.ClinicaConfiguracao
		_ = tx.Where("clinica_id = ?", clinicaID).First(&cfg).Error
		d = cfg.IntervaloConsulta
		if d <= 0 {
			d = 30
		}
	}
	return d
}

func duracaoNovaConsultaTx(tx *gorm.DB, clinicaID uint, principal uint, extras []uint) int {
	total := duracaoProcedimentoEmTx(tx, clinicaID, principal)
	for _, pid := range extras {
		total += duracaoProcedimentoEmTx(tx, clinicaID, pid)
	}
	return total
}

func intervalosAgendaConflitam(aStart, aEnd, bStart, bEnd time.Time) bool {
	return aStart.Before(bEnd) && bStart.Before(aEnd)
}

func contarSobreposicoesAgenda(agendas []models.Agenda, clinicaID uint, db *gorm.DB, start, end time.Time) int {
	n := 0
	for _, a := range agendas {
		exDur := duracaoAgendamentoExistenteTx(db, a, clinicaID)
		exStart := a.DataHora
		exEnd := exStart.Add(time.Duration(exDur) * time.Minute)
		if intervalosAgendaConflitam(start, end, exStart, exEnd) {
			n++
		}
	}
	return n
}

func maxPacientesEfetivo(permiteSimultaneo bool, maxCadastrado int) int {
	max := maxCadastrado
	if max < 1 {
		max = 1
	}
	if !permiteSimultaneo {
		return 1
	}
	return max
}

func validaHorarioNaGradeProfissional(tx *gorm.DB, usuarioID uint, dataHora time.Time, duracaoMin int) error {
	if duracaoMin <= 0 {
		return errors.New("duração da consulta inválida")
	}
	diaSemana := int(dataHora.Weekday())
	var horarios []models.UsuarioHorario
	if err := tx.Where("usuario_id = ? AND dia_semana = ? AND ativo = ?", usuarioID, diaSemana, true).Find(&horarios).Error; err != nil {
		return err
	}
	if len(horarios) == 0 {
		return errors.New("cadastre a grade de atendimento do profissional para este dia da semana (Equipe → horários do usuário)")
	}
	loc := dataHora.Location()
	newStart := dataHora
	newEnd := newStart.Add(time.Duration(duracaoMin) * time.Minute)

	for _, uh := range horarios {
		inicioH, err := time.Parse("15:04", uh.HorarioInicio)
		if err != nil {
			return err
		}
		fimH, err := time.Parse("15:04", uh.HorarioFim)
		if err != nil {
			return err
		}
		inicioCompleto := time.Date(dataHora.Year(), dataHora.Month(), dataHora.Day(), inicioH.Hour(), inicioH.Minute(), 0, 0, loc)
		fimCompleto := time.Date(dataHora.Year(), dataHora.Month(), dataHora.Day(), fimH.Hour(), fimH.Minute(), 0, 0, loc)
		if !newStart.Before(inicioCompleto) && !newEnd.After(fimCompleto) {
			return nil
		}
	}
	return errors.New("o horário escolhido está fora da disponibilidade cadastrada para o profissional neste dia")
}

func duracaoAgendamentoExistenteTx(tx *gorm.DB, ex models.Agenda, clinicaID uint) int {
	total := duracaoProcedimentoEmTx(tx, clinicaID, ex.ProcedimentoID)
	var adicionais []models.AgendaProcedimento
	_ = tx.Where("agenda_id = ?", ex.ID).Find(&adicionais).Error
	for _, ap := range adicionais {
		total += duracaoProcedimentoEmTx(tx, clinicaID, ap.ProcedimentoID)
	}
	return total
}

func (r *agendaRepository) Criar(agenda models.Agenda, procedimentosExtras []uint) (models.Agenda, error) {
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var prof models.Usuario
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND clinica_id = ?", agenda.UsuarioID, agenda.ClinicaID).First(&prof).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("profissional não encontrado nesta clínica")
			}
			return err
		}

		var pac models.Paciente
		if err := tx.Where("id = ? AND clinica_id = ?", agenda.PacienteID, agenda.ClinicaID).First(&pac).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("paciente não encontrado ou não pertence a esta clínica")
			}
			return err
		}

		var proc models.Procedimento
		if err := tx.Where("id = ? AND clinica_id = ?", agenda.ProcedimentoID, agenda.ClinicaID).First(&proc).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("procedimento não encontrado ou não pertence a esta clínica")
			}
			return err
		}

		for _, pid := range procedimentosExtras {
			var p models.Procedimento
			if err := tx.Where("id = ? AND clinica_id = ?", pid, agenda.ClinicaID).First(&p).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return errors.New("procedimento adicional não encontrado ou não pertence a esta clínica")
				}
				return err
			}
		}

		duracao := duracaoNovaConsultaTx(tx, agenda.ClinicaID, agenda.ProcedimentoID, procedimentosExtras)

		locSP := utils.LocSaoPaulo()
		ah := agenda.DataHora.In(locSP)
		now := time.Now().In(locSP)
		nowMin := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), now.Minute(), 0, 0, locSP)
		if ah.Before(nowMin) {
			return errors.New("não é permitido agendar em horário retroativo: escolha um horário igual ou posterior ao horário atual")
		}

		if err := validaHorarioNaGradeProfissional(tx, agenda.UsuarioID, agenda.DataHora, duracao); err != nil {
			return err
		}

		if agenda.StatusAgendamentoID == 0 {
			var st models.StatusAgendamento
			if err := tx.Where("nome = ?", "Agendado").First(&st).Error; err != nil {
				return errors.New("status padrão Agendado não encontrado")
			}
			agenda.StatusAgendamentoID = st.ID
		}

		var bloqueantes []uint
		_ = tx.Model(&models.StatusAgendamento{}).Where("nome IN ?", []string{"Agendado", "Confirmado", "Em atendimento"}).Pluck("id", &bloqueantes).Error
		if len(bloqueantes) == 0 {
			bloqueantes = []uint{1, 2}
		}
		loc := agenda.DataHora.Location()
		dayStart := time.Date(agenda.DataHora.Year(), agenda.DataHora.Month(), agenda.DataHora.Day(), 0, 0, 0, 0, loc)
		dayEnd := dayStart.Add(24 * time.Hour)

		var existentes []models.Agenda
		if err := tx.Where(
			"usuario_id = ? AND clinica_id = ? AND data_hora >= ? AND data_hora < ? AND status_agendamento_id IN ?",
			agenda.UsuarioID, agenda.ClinicaID, dayStart, dayEnd, bloqueantes,
		).Find(&existentes).Error; err != nil {
			return err
		}

		newStart := agenda.DataHora
		newEnd := newStart.Add(time.Duration(duracao) * time.Minute)
		maxSim := maxPacientesEfetivo(prof.PermiteSimultaneo, prof.MaxPacientes)
		if n := contarSobreposicoesAgenda(existentes, agenda.ClinicaID, tx, newStart, newEnd); n >= maxSim {
			if maxSim <= 1 {
				return ErrConflitoAgendamento
			}
			return ErrCapacidadeAgendaExcedida
		}

		if err := tx.Create(&agenda).Error; err != nil {
			return err
		}
		for _, pid := range procedimentosExtras {
			row := models.AgendaProcedimento{AgendaID: agenda.ID, ProcedimentoID: pid}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return agenda, err
}

func (r *agendaRepository) Listar(clinicaID uint, dia *time.Time, usuarioID *uint) ([]models.Agenda, error) {
	var agendas []models.Agenda
	q := r.db.
		Preload("Paciente", "clinica_id = ?", clinicaID).
		Preload("Usuario", "clinica_id = ?", clinicaID).
		Preload("Procedimento", "clinica_id = ?", clinicaID).
		Preload("ProcedimentosExtras").
		Preload("ProcedimentosExtras.Procedimento", "clinica_id = ?", clinicaID).
		Preload("Convenio", "clinica_id = ?", clinicaID).
		Preload("StatusAgendamento").
		Where("clinica_id = ?", clinicaID)

	if dia != nil {
		loc := dia.Location()
		dayStart := time.Date(dia.Year(), dia.Month(), dia.Day(), 0, 0, 0, 0, loc)
		dayEnd := dayStart.Add(24 * time.Hour)
		q = q.Where("data_hora >= ? AND data_hora < ?", dayStart, dayEnd)
	}
	if usuarioID != nil && *usuarioID > 0 {
		q = q.Where("usuario_id = ?", *usuarioID)
	}

	err := q.Order("data_hora asc").Find(&agendas).Error
	return agendas, err
}

func (r *agendaRepository) LiberarCobranca(clinicaID, agendaID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var agenda models.Agenda
		if err := tx.Preload("StatusAgendamento").Where("id = ? AND clinica_id = ?", agendaID, clinicaID).First(&agenda).Error; err != nil {
			return err
		}
		nome := strings.TrimSpace(agenda.StatusAgendamento.Nome)
		if nome == "" {
			var st models.StatusAgendamento
			if err := tx.Where("id = ?", agenda.StatusAgendamentoID).First(&st).Error; err != nil {
				return err
			}
			nome = strings.TrimSpace(st.Nome)
		}
		if !strings.EqualFold(nome, "Realizado") {
			return errors.New("só é possível liberar cobrança com status Realizado")
		}
		now := time.Now()
		return tx.Model(&models.Agenda{}).Where("id = ? AND clinica_id = ?", agendaID, clinicaID).
			Update("liberado_cobranca_em", now).Error
	})
}

func (r *agendaRepository) AtualizarStatus(clinicaID, id, statusID, usuarioLancamentoID uint, pularReceitaAutomatica bool) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var agenda models.Agenda
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Paciente").
			Preload("Procedimento").
			Preload("ProcedimentosExtras.Procedimento").
			Preload("StatusAgendamento").
			Where("id = ? AND clinica_id = ?", id, clinicaID).First(&agenda).Error
		if err != nil {
			return err
		}

		oldNome := strings.TrimSpace(agenda.StatusAgendamento.Nome)
		if oldNome == "" {
			var oldSt models.StatusAgendamento
			if err := tx.Where("id = ?", agenda.StatusAgendamentoID).First(&oldSt).Error; err == nil {
				oldNome = strings.TrimSpace(oldSt.Nome)
			}
		}

		var novoSt models.StatusAgendamento
		if err := tx.Where("id = ?", statusID).First(&novoSt).Error; err != nil {
			return err
		}

		if agenda.StatusAgendamentoID == statusID {
			return nil
		}

		if err := tx.Model(&models.Agenda{}).Where("id = ? AND clinica_id = ?", id, clinicaID).
			Update("status_agendamento_id", statusID).Error; err != nil {
			return err
		}

		novoNome := strings.TrimSpace(novoSt.Nome)
		becomingRealizado := strings.EqualFold(novoNome, "Realizado") && !strings.EqualFold(oldNome, "Realizado")
		// Com cobrança na recepção ativa, ao concluir a consulta entra na fila de pagamentos sem passo extra de "liberar cobrança".
		if becomingRealizado && pularReceitaAutomatica {
			semConvenio := agenda.ConvenioID == nil || *agenda.ConvenioID == 0
			if semConvenio {
				now := time.Now()
				if err := tx.Model(&models.Agenda{}).Where("id = ? AND clinica_id = ? AND liberado_cobranca_em IS NULL", id, clinicaID).
					Update("liberado_cobranca_em", now).Error; err != nil {
					return err
				}
			}
		}

		if !strings.EqualFold(novoNome, "Realizado") || strings.EqualFold(oldNome, "Realizado") {
			return nil
		}
		if pularReceitaAutomatica {
			return nil
		}

		total := agenda.Procedimento.Valor
		for _, ap := range agenda.ProcedimentosExtras {
			total += ap.Procedimento.Valor
		}
		if total <= 0 || usuarioLancamentoID == 0 {
			return nil
		}

		cat := "PARTICULAR"
		if agenda.ConvenioID != nil && *agenda.ConvenioID > 0 {
			cat = "CONVENIO"
		}
		desc := fmt.Sprintf("Consulta realizada (agendamento #%d)", agenda.ID)
		if strings.TrimSpace(agenda.Paciente.Nome) != "" {
			desc = fmt.Sprintf("Atendimento %s (ag. #%d)", strings.TrimSpace(agenda.Paciente.Nome), agenda.ID)
		}
		loc := utils.LocSaoPaulo()
		dh := agenda.DataHora.In(loc)
		dataL := time.Date(dh.Year(), dh.Month(), dh.Day(), 0, 0, 0, 0, loc)
		lf := models.LancamentoFinanceiro{
			ClinicaID: clinicaID,
			UsuarioID: usuarioLancamentoID,
			Data:      dataL,
			Descricao: desc,
			Valor:     total,
			Tipo:      "RECEITA",
			Categoria: cat,
		}
		return tx.Create(&lf).Error
	})
}

func (r *agendaRepository) BuscarPorIDClinica(id, clinicaID uint) (*models.Agenda, error) {
	var a models.Agenda
	err := r.db.Where("id = ? AND clinica_id = ?", id, clinicaID).First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func statusImpedeTrocaProfissionalAgenda(nome string) bool {
	n := strings.ToUpper(strings.TrimSpace(nome))
	if n == "" {
		return false
	}
	if n == "REALIZADO" || n == "CANCELADO" {
		return true
	}
	if strings.Contains(n, "FALT") {
		return true
	}
	if strings.Contains(n, "ATENDIMENTO") {
		return true
	}
	return false
}

func papelUsuarioProfissionalAgenda(papel string) bool {
	p := strings.TrimSpace(strings.ToUpper(papel))
	return p == rbac.PapelMedico || p == rbac.PapelDono
}

// AtualizarProfissionalAgenda troca o profissional (médico/dono) mantendo data, paciente e procedimentos.
func (r *agendaRepository) AtualizarProfissionalAgenda(clinicaID, agendaID, novoUsuarioID uint) error {
	if novoUsuarioID == 0 {
		return errors.New("usuario_id inválido")
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		var ag models.Agenda
		if err := tx.Preload("StatusAgendamento").Where("id = ? AND clinica_id = ?", agendaID, clinicaID).First(&ag).Error; err != nil {
			return err
		}
		if ag.StatusAgendamentoID > 0 && statusImpedeTrocaProfissionalAgenda(ag.StatusAgendamento.Nome) {
			return errors.New("não é possível trocar o profissional neste status do agendamento")
		}
		if ag.UsuarioID == novoUsuarioID {
			return nil
		}

		var novoProf models.Usuario
		if err := tx.Preload("TipoUsuario").Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND clinica_id = ?", novoUsuarioID, clinicaID).First(&novoProf).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("profissional não encontrado nesta clínica")
			}
			return err
		}
		if novoProf.TipoUsuario.Papel == "" || !papelUsuarioProfissionalAgenda(novoProf.TipoUsuario.Papel) {
			return errors.New("usuário selecionado não é um profissional da agenda (médico ou dono)")
		}

		duracao := duracaoAgendamentoExistenteTx(tx, ag, clinicaID)
		if err := validaHorarioNaGradeProfissional(tx, novoUsuarioID, ag.DataHora, duracao); err != nil {
			return err
		}

		var bloqueantes []uint
		_ = tx.Model(&models.StatusAgendamento{}).Where("nome IN ?", []string{"Agendado", "Confirmado", "Em atendimento"}).Pluck("id", &bloqueantes).Error
		if len(bloqueantes) == 0 {
			bloqueantes = []uint{1, 2}
		}
		loc := ag.DataHora.Location()
		dayStart := time.Date(ag.DataHora.Year(), ag.DataHora.Month(), ag.DataHora.Day(), 0, 0, 0, 0, loc)
		dayEnd := dayStart.Add(24 * time.Hour)

		var existentes []models.Agenda
		if err := tx.Where(
			"usuario_id = ? AND clinica_id = ? AND data_hora >= ? AND data_hora < ? AND status_agendamento_id IN ? AND id != ?",
			novoUsuarioID, clinicaID, dayStart, dayEnd, bloqueantes, agendaID,
		).Find(&existentes).Error; err != nil {
			return err
		}
		newStart := ag.DataHora
		newEnd := newStart.Add(time.Duration(duracao) * time.Minute)
		maxSim := maxPacientesEfetivo(novoProf.PermiteSimultaneo, novoProf.MaxPacientes)
		if n := contarSobreposicoesAgenda(existentes, clinicaID, tx, newStart, newEnd); n >= maxSim {
			if maxSim <= 1 {
				return ErrConflitoAgendamento
			}
			return ErrCapacidadeAgendaExcedida
		}

		return tx.Model(&models.Agenda{}).Where("id = ? AND clinica_id = ?", agendaID, clinicaID).Update("usuario_id", novoUsuarioID).Error
	})
}

func (r *agendaRepository) StatusIDPorNome(nome string) (uint, error) {
	var st models.StatusAgendamento
	n := strings.TrimSpace(nome)
	if n == "" {
		return 0, gorm.ErrRecordNotFound
	}
	// Case-insensitive: bases antigas podem ter "EM ATENDIMENTO" ou variação sem acento.
	q := strings.TrimSpace(strings.ToLower(n))
	if err := r.db.Where("LOWER(TRIM(nome)) = ?", q).First(&st).Error; err != nil {
		return 0, err
	}
	return st.ID, nil
}

func (r *agendaRepository) HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time, duracaoTotalMin uint) ([]time.Time, error) {
	var prof models.Usuario
	if err := r.db.Where("id = ? AND clinica_id = ?", usuarioID, clinicaID).First(&prof).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("profissional não encontrado nesta clínica")
		}
		return nil, err
	}

	loc := utils.LocSaoPaulo()
	diaRef := time.Date(data.Year(), data.Month(), data.Day(), 0, 0, 0, 0, loc)
	diaSemana := int(diaRef.Weekday())
	var usuarioHorarios []models.UsuarioHorario
	err := r.db.Where("usuario_id = ? AND dia_semana = ? AND ativo = ?", usuarioID, diaSemana, true).Find(&usuarioHorarios).Error
	if err != nil {
		return nil, err
	}
	if len(usuarioHorarios) == 0 {
		return []time.Time{}, nil
	}
	// Mais de um registro no mesmo dia (ex.: migração antiga sem apagar antes do PUT) gerava intervalo extra
	// e o primeiro horário podia aparecer 3 h “errado” vs a grade atual — mantém só o mais recente.
	if len(usuarioHorarios) > 1 {
		sort.Slice(usuarioHorarios, func(i, j int) bool {
			if usuarioHorarios[i].UpdatedAt.Equal(usuarioHorarios[j].UpdatedAt) {
				return usuarioHorarios[i].ID > usuarioHorarios[j].ID
			}
			return usuarioHorarios[i].UpdatedAt.After(usuarioHorarios[j].UpdatedAt)
		})
		usuarioHorarios = usuarioHorarios[:1]
	}

	var config models.ClinicaConfiguracao
	err = r.db.Where("clinica_id = ?", clinicaID).First(&config).Error
	if err != nil {
		config = models.ClinicaConfiguracao{IntervaloConsulta: 30}
	}

	grid := config.IntervaloConsulta
	if grid <= 0 {
		grid = 30
	}

	var procedimento models.Procedimento
	if err := r.db.Where("id = ? AND clinica_id = ?", procedimentoID, clinicaID).First(&procedimento).Error; err != nil {
		return nil, err
	}

	durNecessaria := int(duracaoTotalMin)
	if durNecessaria <= 0 {
		durNecessaria = procedimento.Duracao
	}
	if durNecessaria <= 0 {
		durNecessaria = grid
	}

	var bloqueantes []uint
	_ = r.db.Model(&models.StatusAgendamento{}).Where("nome IN ?", []string{"Agendado", "Confirmado", "Em atendimento"}).Pluck("id", &bloqueantes).Error
	if len(bloqueantes) == 0 {
		bloqueantes = []uint{1, 2, 3}
	}

	dayStart := diaRef
	dayEnd := dayStart.Add(24 * time.Hour)

	var agendas []models.Agenda
	err = r.db.
		Where("usuario_id = ? AND clinica_id = ? AND data_hora >= ? AND data_hora < ? AND status_agendamento_id IN ?",
			usuarioID, clinicaID, dayStart, dayEnd, bloqueantes).
		Find(&agendas).Error
	if err != nil {
		return nil, err
	}

	var disponiveis []time.Time
	seen := make(map[time.Time]struct{})
	now := time.Now().In(loc)
	nowMin := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), now.Minute(), 0, 0, loc)

	for _, uh := range usuarioHorarios {
		inicio, errP := time.Parse("15:04", uh.HorarioInicio)
		if errP != nil {
			return nil, errP
		}
		fim, errP := time.Parse("15:04", uh.HorarioFim)
		if errP != nil {
			return nil, errP
		}

		inicioCompleto := time.Date(diaRef.Year(), diaRef.Month(), diaRef.Day(), inicio.Hour(), inicio.Minute(), 0, 0, loc)
		fimCompleto := time.Date(diaRef.Year(), diaRef.Month(), diaRef.Day(), fim.Hour(), fim.Minute(), 0, 0, loc)

		for h := inicioCompleto; h.Before(fimCompleto); h = h.Add(time.Duration(grid) * time.Minute) {
			newEnd := h.Add(time.Duration(durNecessaria) * time.Minute)
			if newEnd.After(fimCompleto) {
				break
			}
			slot := time.Date(h.Year(), h.Month(), h.Day(), h.Hour(), h.Minute(), 0, 0, loc)
			if _, ok := seen[slot]; ok {
				continue
			}
			maxSim := maxPacientesEfetivo(prof.PermiteSimultaneo, prof.MaxPacientes)
			if contarSobreposicoesAgenda(agendas, clinicaID, r.db, h, newEnd) >= maxSim {
				continue
			}
			if slot.Before(nowMin) {
				continue
			}
			seen[slot] = struct{}{}
			disponiveis = append(disponiveis, h)
		}
	}

	sort.Slice(disponiveis, func(i, j int) bool { return disponiveis[i].Before(disponiveis[j]) })
	return disponiveis, nil
}
