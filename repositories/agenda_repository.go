package repositories

import (
	"time"

	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type AgendaReposiory interface {
	Criar(agenda models.Agenda) (models.Agenda, error)
	Listar(clinicaID uint) ([]models.Agenda, error)
	AtualizarStatus(id, statusID uint) error
	HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time) ([]time.Time, error)
}

type agendaRepository struct {
	db *gorm.DB
}

func NovaAgendaRepository(db *gorm.DB) AgendaReposiory {
	return &agendaRepository{db: db}
}

func (r *agendaRepository) Criar(agenda models.Agenda) (models.Agenda, error) {
	err := r.db.Create(&agenda).Error
	return agenda, err
}

func (r *agendaRepository) Listar(clinicaID uint) ([]models.Agenda, error) {
	var agendas []models.Agenda
	err := r.db.
		Preload("Paciente").
		Preload("Usuario").
		Preload("Procedimento").
		Preload("Convenio").
		Preload("Status").
		Where("clinica_id = ?", clinicaID).
		Find(&agendas).Error
	return agendas, err

}

func (r *agendaRepository) AtualizarStatus(id, statusID uint) error {
	return r.db.Model(&models.Agenda{}).Where("id = ?", id).Update("status_id", statusID).Error
}

func (r *agendaRepository) HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time) ([]time.Time, error) {
	// Buscar horários de trabalho do usuário para o dia da semana
	diaSemana := int(data.Weekday())
	var usuarioHorario models.UsuarioHorario
	err := r.db.Where("usuario_id = ? AND dia_semana = ? AND ativo = ?", usuarioID, diaSemana, true).First(&usuarioHorario).Error
	if err != nil {
		// Se usuário não trabalha neste dia, retornar vazio
		return []time.Time{}, nil
	}

	// Converter horários string para time.Time
	inicio, err := time.Parse("15:04", usuarioHorario.HorarioInicio)
	if err != nil {
		return nil, err
	}
	fim, err := time.Parse("15:04", usuarioHorario.HorarioFim)
	if err != nil {
		return nil, err
	}

	// Criar horários completos para o dia
	inicioCompleto := time.Date(data.Year(), data.Month(), data.Day(), inicio.Hour(), inicio.Minute(), 0, 0, data.Location())
	fimCompleto := time.Date(data.Year(), data.Month(), data.Day(), fim.Hour(), fim.Minute(), 0, 0, data.Location())

	// Buscar configurações da clínica para intervalo padrão
	var config models.ClinicaConfiguracao
	err = r.db.Where("clinica_id = ?", clinicaID).First(&config).Error
	if err != nil {
		config = models.ClinicaConfiguracao{IntervaloConsulta: 30} // padrão
	}

	// Buscar procedimento para saber a duração
	var procedimento models.Procedimento
	if err := r.db.Where("id = ?", procedimentoID).First(&procedimento).Error; err != nil {
		return nil, err
	}

	// Usar duração do procedimento ou intervalo padrão da clínica
	intervalo := config.IntervaloConsulta
	if procedimento.Duracao > 0 {
		intervalo = procedimento.Duracao
	}

	// Buscar agendamentos existentes para o profissional nesse dia
	var agendas []models.Agenda
	err = r.db.
		Where("usuario_id = ? AND DATE(data_hora) = ? AND status_id IN (1, 2)", usuarioID, data.Format("2006-01-02")).
		Find(&agendas).Error
	if err != nil {
		return nil, err
	}

	// Criar mapa de horários ocupados
	ocupados := make(map[time.Time]bool)
	for _, a := range agendas {
		// Marcar o horário e os próximos minutos como ocupados
		for i := 0; i < intervalo; i += 15 {
			horarioOcupado := a.DataHora.Add(time.Duration(i) * time.Minute)
			ocupados[horarioOcupado] = true
		}
	}

	// Gerar lista de horários disponíveis
	var disponiveis []time.Time
	for h := inicioCompleto; h.Before(fimCompleto); h = h.Add(time.Duration(intervalo) * time.Minute) {
		// Verificar se o horário + duração do procedimento não ultrapassa o fim do expediente
		if h.Add(time.Duration(intervalo) * time.Minute).After(fimCompleto) {
			break
		}
		
		if !ocupados[h] {
			disponiveis = append(disponiveis, h)
		}
	}

	return disponiveis, nil
}
