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
	// Definir intervalo de trabalho (exemplo: 08h às 18h)
	inicio := time.Date(data.Year(), data.Month(), data.Day(), 8, 0, 0, 0, data.Location())
	fim := time.Date(data.Year(), data.Month(), data.Day(), 18, 0, 0, 0, data.Location())

	var procedimento models.Procedimento
	if err := r.db.Where("id = ?", procedimentoID).Find(&procedimento).Error; err != nil {
		return nil, err
	}

	// Buscar agendamentos existentes para o profissional nesse dia
	var agendas []models.Agenda
	err := r.db.
		Where("usuario_id = ? AND DATE(data_hora) = ? AND status_id = ?", usuarioID, data.Format("2006-01-02"), 1). // status 1 = Agendado
		Find(&agendas).Error
	if err != nil {
		return nil, err
	}

	// Criar mapa de horários ocupados
	ocupados := make(map[time.Time]bool)
	for _, a := range agendas {
		ocupados[a.DataHora] = true
	}

	// Gerar lista de horários disponíveis
	var disponiveis []time.Time
	for h := inicio; h.Add(time.Minute * time.Duration(procedimento.Duracao)).Before(fim); h = h.Add(time.Minute * time.Duration(procedimento.Duracao)) {
		if !ocupados[h] {
			disponiveis = append(disponiveis, h)
		}
	}

	return disponiveis, nil
}
