package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type TelaService interface {
	CriarTela(t *models.Tela) error
	BuscarTelaPorID(id int) (*models.Tela, error)
	BuscarTelaPorRota(rota string) (*models.Tela, error)
	ListarTelas() ([]*models.Tela, error)
	ListarTelasPorAssinatura(assinaturaID int) ([]*models.Tela, error)
	AtualizarTela(t *models.Tela) error
	Reativar(id int) error
	Desativar(id int) error
}

type telaService struct {
	telaRepository repositories.TelaRepository
}

func NovaTelaService(telaRepository repositories.TelaRepository) TelaService {
	return &telaService{
		telaRepository: telaRepository,
	}
}
func (s *telaService) CriarTela(t *models.Tela) error {
	return s.telaRepository.CriarTela(t)
}

func (s *telaService) BuscarTelaPorID(id int) (*models.Tela, error) {
	return s.telaRepository.BuscarTelaPorID(id)
}

func (s *telaService) BuscarTelaPorRota(rota string) (*models.Tela, error) {
	return s.telaRepository.BuscarTelaPorRota(rota)
}

func (s *telaService) ListarTelas() ([]*models.Tela, error) {
	return s.telaRepository.ListarTelas()
}

func (s *telaService) ListarTelasPorAssinatura(assinaturaID int) ([]*models.Tela, error) {
	return s.telaRepository.ListarTelasPorAssinatura(assinaturaID)
}

func (s *telaService) AtualizarTela(t *models.Tela) error {
	return s.telaRepository.AtualizarTela(t)
}

func (s *telaService) Desativar(id int) error {
	return s.telaRepository.Desativar(id)
}

func (s *telaService) Reativar(id int) error {
	return s.telaRepository.Reativar(id)
}
