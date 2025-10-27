package services

import (
	"github.com/ferrariwill/Clinicas/repositories"
)

type PlanoTelaService interface {
	PlanoTemAcesso(planoID uint, rota string) (bool, error)
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
