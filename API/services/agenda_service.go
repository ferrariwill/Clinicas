package services

import (
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
)

type AgendaService interface {
	Criar(agenda models.Agenda, procedimentosExtras []uint) (models.Agenda, error)
	Listar(clinicaID uint, dia *time.Time, usuarioID *uint) ([]models.Agenda, error)
	BuscarPorIDClinica(clinicaID, agendaID uint) (*models.Agenda, error)
	AtualizarStatus(clinicaID, id, statusID, usuarioLancamentoID uint) error
	LiberarCobranca(clinicaID, agendaID uint) error
	AtualizarProfissionalAgenda(clinicaID, agendaID, novoUsuarioID uint) error
	HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time, duracaoTotalMin uint) ([]time.Time, error)
	StatusIDPorNome(nome string) (uint, error)
}

type agendaService struct {
	agendaRepository repositories.AgendaReposiory
	configRepo       repositories.ConfiguracaoRepository
}

func NovaAgendaService(agendaRepository repositories.AgendaReposiory, configRepo repositories.ConfiguracaoRepository) AgendaService {
	return &agendaService{
		agendaRepository: agendaRepository,
		configRepo:       configRepo,
	}
}

func (r *agendaService) Criar(agenda models.Agenda, procedimentosExtras []uint) (models.Agenda, error) {
	return r.agendaRepository.Criar(agenda, procedimentosExtras)
}

func (r *agendaService) Listar(clinicaID uint, dia *time.Time, usuarioID *uint) ([]models.Agenda, error) {
	return r.agendaRepository.Listar(clinicaID, dia, usuarioID)
}

func (r *agendaService) BuscarPorIDClinica(clinicaID, agendaID uint) (*models.Agenda, error) {
	return r.agendaRepository.BuscarPorIDClinica(agendaID, clinicaID)
}

func (r *agendaService) AtualizarStatus(clinicaID uint, id, statusID, usuarioLancamentoID uint) error {
	cfg, err := r.configRepo.BuscarPorClinica(clinicaID)
	pular := err == nil && cfg != nil && cfg.UsaCobrancaIntegrada
	return r.agendaRepository.AtualizarStatus(clinicaID, id, statusID, usuarioLancamentoID, pular)
}

func (r *agendaService) LiberarCobranca(clinicaID, agendaID uint) error {
	return r.agendaRepository.LiberarCobranca(clinicaID, agendaID)
}

func (r *agendaService) AtualizarProfissionalAgenda(clinicaID, agendaID, novoUsuarioID uint) error {
	return r.agendaRepository.AtualizarProfissionalAgenda(clinicaID, agendaID, novoUsuarioID)
}

func (r *agendaService) HorariosDisponiveis(usuarioID, clinicaID, procedimentoID uint, data time.Time, duracaoTotalMin uint) ([]time.Time, error) {
	return r.agendaRepository.HorariosDisponiveis(usuarioID, clinicaID, procedimentoID, data, duracaoTotalMin)
}

func (r *agendaService) StatusIDPorNome(nome string) (uint, error) {
	return r.agendaRepository.StatusIDPorNome(nome)
}
