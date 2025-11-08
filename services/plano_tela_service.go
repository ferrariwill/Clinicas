package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type PlanoTelaService interface {
	PlanoTemAcesso(planoID uint, rota string) (bool, error)
	Criar(planoTela *models.PlanoTela) error
	ListarTelasDoPlano(planoID uint) ([]models.Tela, error)
	RemoverTelaDoPlano(planoID, telaID uint) error
}

type planoTelaService struct {
	repo repositories.PlanoTelaRepository
}

func NovoPlanoTelaService(repo repositories.PlanoTelaRepository) PlanoTelaService {
	return &planoTelaService{repo: repo}
}

func (s *planoTelaService) PlanoTemAcesso(planoID uint, rota string) (bool, error) {
	permissao, err := s.repo.PlanoTemAcesso(planoID, rota)
	if err != nil {
		return false, err
	}

	return permissao, nil
}

func (s *planoTelaService) Criar(planoTela *models.PlanoTela) error {
	return s.repo.Criar(planoTela)
}

func (s *planoTelaService) ListarTelasDoPlano(planoID uint) ([]models.Tela, error) {
	return s.repo.ListarTelasDoPlano(planoID)
}

func (s *planoTelaService) RemoverTelaDoPlano(planoID, telaID uint) error {
	return s.repo.RemoverTelaDoPlano(planoID, telaID)
}
