package services

import (
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
)

type AgendaService interface {
	Criar(agenda models.Agenda, procedimentosExtras []uint) (models.Agenda, error)
	Listar(clinicaID uint, dia *time.Time, usuarioID *uint) ([]models.Agenda, error)
	AtualizarStatus(clinicaID, id, statusID, usuarioLancamentoID uint) error
	HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time, duracaoTotalMin uint) ([]time.Time, error)
	StatusIDPorNome(nome string) (uint, error)
}

type agendaService struct {
	agendaRepository repositories.AgendaReposiory
}

func NovaAgendaService(agendaRepository repositories.AgendaReposiory) AgendaService {
	return &agendaService{
		agendaRepository: agendaRepository,
	}
}

func (r *agendaService) Criar(agenda models.Agenda, procedimentosExtras []uint) (models.Agenda, error) {
	return r.agendaRepository.Criar(agenda, procedimentosExtras)
}

func (r *agendaService) Listar(clinicaID uint, dia *time.Time, usuarioID *uint) ([]models.Agenda, error) {
	return r.agendaRepository.Listar(clinicaID, dia, usuarioID)
}

func (r *agendaService) AtualizarStatus(clinicaID, id, statusID, usuarioLancamentoID uint) error {
	return r.agendaRepository.AtualizarStatus(clinicaID, id, statusID, usuarioLancamentoID)
}

func (r *agendaService) HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time, duracaoTotalMin uint) ([]time.Time, error) {
	return r.agendaRepository.HorariosDisponiveis(usuarioID, clinicaID, procedimentoID, data, duracaoTotalMin)
}

func (r *agendaService) StatusIDPorNome(nome string) (uint, error) {
	return r.agendaRepository.StatusIDPorNome(nome)
}
