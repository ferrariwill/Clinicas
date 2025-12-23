package services

import (
	"time"

	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type AgendaService interface {
	Criar(agenda models.Agenda) (models.Agenda, error)
	Listar(clinicaID uint) ([]models.Agenda, error)
	AtualizarStatus(id, statusID uint) error
	HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time) ([]time.Time, error)
}

type agendaService struct {
	agendaRepository repositories.AgendaReposiory
}

func NovaAgendaService(agendaRepository repositories.AgendaReposiory) AgendaService {
	return &agendaService{
		agendaRepository: agendaRepository,
	}
}

func (r *agendaService) Criar(agenda models.Agenda) (models.Agenda, error) {
	return r.agendaRepository.Criar(agenda)
}

func (r *agendaService) Listar(clinicaID uint) ([]models.Agenda, error) {
	return r.agendaRepository.Listar(clinicaID)
}

func (r *agendaService) AtualizarStatus(id, statusID uint) error {
	return r.agendaRepository.AtualizarStatus(id, statusID)
}

func (r *agendaService) HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time) ([]time.Time, error) {
	return r.agendaRepository.HorariosDisponiveis(usuarioID, clinicaID, procedimentoID, data)
}
