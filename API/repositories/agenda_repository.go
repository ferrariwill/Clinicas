package repositories

import (
	"errors"
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrConflitoAgendamento indica sobreposição de horário para o mesmo profissional.
var ErrConflitoAgendamento = errors.New("conflito de horário: o profissional já possui agendamento neste intervalo")

type AgendaReposiory interface {
	Criar(agenda models.Agenda) (models.Agenda, error)
	Listar(clinicaID uint) ([]models.Agenda, error)
	AtualizarStatus(clinicaID, id, statusID uint) error
	HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time) ([]time.Time, error)
	BuscarPorIDClinica(id, clinicaID uint) (*models.Agenda, error)
}

type agendaRepository struct {
	db *gorm.DB
}

func NovaAgendaRepository(db *gorm.DB) AgendaReposiory {
	return &agendaRepository{db: db}
}

func (r *agendaRepository) Criar(agenda models.Agenda) (models.Agenda, error) {
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

		duracao := proc.Duracao
		if duracao <= 0 {
			var cfg models.ClinicaConfiguracao
			_ = tx.Where("clinica_id = ?", agenda.ClinicaID).First(&cfg).Error
			duracao = cfg.IntervaloConsulta
			if duracao <= 0 {
				duracao = 30
			}
		}

		if !prof.PermiteSimultaneo {
			var bloqueantes []uint
			_ = tx.Model(&models.StatusAgendamento{}).Where("nome IN ?", []string{"Agendado", "Confirmado"}).Pluck("id", &bloqueantes).Error
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

			for _, ex := range existentes {
				var exProc models.Procedimento
				if err := tx.Where("id = ? AND clinica_id = ?", ex.ProcedimentoID, agenda.ClinicaID).First(&exProc).Error; err != nil {
					return err
				}
				exDur := exProc.Duracao
				if exDur <= 0 {
					var cfg models.ClinicaConfiguracao
					_ = tx.Where("clinica_id = ?", agenda.ClinicaID).First(&cfg).Error
					exDur = cfg.IntervaloConsulta
					if exDur <= 0 {
						exDur = 30
					}
				}
				exStart := ex.DataHora
				exEnd := exStart.Add(time.Duration(exDur) * time.Minute)
				if newStart.Before(exEnd) && exStart.Before(newEnd) {
					return ErrConflitoAgendamento
				}
			}
		}

		return tx.Create(&agenda).Error
	})
	return agenda, err
}

func (r *agendaRepository) Listar(clinicaID uint) ([]models.Agenda, error) {
	var agendas []models.Agenda
	err := r.db.
		Preload("Paciente", "clinica_id = ?", clinicaID).
		Preload("Usuario", "clinica_id = ?", clinicaID).
		Preload("Procedimento", "clinica_id = ?", clinicaID).
		Preload("Convenio", "clinica_id = ?", clinicaID).
		Preload("StatusAgendamento").
		Where("clinica_id = ?", clinicaID).
		Find(&agendas).Error
	return agendas, err
}

func (r *agendaRepository) AtualizarStatus(clinicaID, id, statusID uint) error {
	res := r.db.Model(&models.Agenda{}).Where("id = ? AND clinica_id = ?", id, clinicaID).Update("status_agendamento_id", statusID)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *agendaRepository) BuscarPorIDClinica(id, clinicaID uint) (*models.Agenda, error) {
	var a models.Agenda
	err := r.db.Where("id = ? AND clinica_id = ?", id, clinicaID).First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *agendaRepository) HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time) ([]time.Time, error) {
	var prof models.Usuario
	if err := r.db.Where("id = ? AND clinica_id = ?", usuarioID, clinicaID).First(&prof).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("profissional não encontrado nesta clínica")
		}
		return nil, err
	}

	diaSemana := int(data.Weekday())
	var usuarioHorario models.UsuarioHorario
	err := r.db.Where("usuario_id = ? AND dia_semana = ? AND ativo = ?", usuarioID, diaSemana, true).First(&usuarioHorario).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []time.Time{}, nil
		}
		return nil, err
	}

	inicio, err := time.Parse("15:04", usuarioHorario.HorarioInicio)
	if err != nil {
		return nil, err
	}
	fim, err := time.Parse("15:04", usuarioHorario.HorarioFim)
	if err != nil {
		return nil, err
	}

	inicioCompleto := time.Date(data.Year(), data.Month(), data.Day(), inicio.Hour(), inicio.Minute(), 0, 0, data.Location())
	fimCompleto := time.Date(data.Year(), data.Month(), data.Day(), fim.Hour(), fim.Minute(), 0, 0, data.Location())

	var config models.ClinicaConfiguracao
	err = r.db.Where("clinica_id = ?", clinicaID).First(&config).Error
	if err != nil {
		config = models.ClinicaConfiguracao{IntervaloConsulta: 30}
	}

	var procedimento models.Procedimento
	if err := r.db.Where("id = ? AND clinica_id = ?", procedimentoID, clinicaID).First(&procedimento).Error; err != nil {
		return nil, err
	}

	intervalo := config.IntervaloConsulta
	if procedimento.Duracao > 0 {
		intervalo = procedimento.Duracao
	}

	var bloqueantes []uint
	_ = r.db.Model(&models.StatusAgendamento{}).Where("nome IN ?", []string{"Agendado", "Confirmado"}).Pluck("id", &bloqueantes).Error
	if len(bloqueantes) == 0 {
		bloqueantes = []uint{1, 2}
	}

	loc := data.Location()
	dayStart := time.Date(data.Year(), data.Month(), data.Day(), 0, 0, 0, 0, loc)
	dayEnd := dayStart.Add(24 * time.Hour)

	var agendas []models.Agenda
	err = r.db.
		Where("usuario_id = ? AND clinica_id = ? AND data_hora >= ? AND data_hora < ? AND status_agendamento_id IN ?",
			usuarioID, clinicaID, dayStart, dayEnd, bloqueantes).
		Find(&agendas).Error
	if err != nil {
		return nil, err
	}

	ocupados := make(map[time.Time]bool)
	if !prof.PermiteSimultaneo {
		step := time.Duration(intervalo) * time.Minute
		if step <= 0 {
			step = 30 * time.Minute
		}
		for _, a := range agendas {
			var proc models.Procedimento
			if err := r.db.Where("id = ? AND clinica_id = ?", a.ProcedimentoID, clinicaID).First(&proc).Error; err != nil {
				return nil, err
			}
			dur := proc.Duracao
			if dur <= 0 {
				dur = config.IntervaloConsulta
				if dur <= 0 {
					dur = 30
				}
			}
			end := a.DataHora.Add(time.Duration(dur) * time.Minute)
			for t := a.DataHora; t.Before(end); t = t.Add(step) {
				slot := time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), 0, 0, loc)
				ocupados[slot] = true
			}
		}
	}

	var disponiveis []time.Time
	for h := inicioCompleto; h.Before(fimCompleto); h = h.Add(time.Duration(intervalo) * time.Minute) {
		if h.Add(time.Duration(intervalo) * time.Minute).After(fimCompleto) {
			break
		}
		slot := time.Date(h.Year(), h.Month(), h.Day(), h.Hour(), h.Minute(), 0, 0, loc)
		if !prof.PermiteSimultaneo && ocupados[slot] {
			continue
		}
		disponiveis = append(disponiveis, h)
	}

	return disponiveis, nil
}
