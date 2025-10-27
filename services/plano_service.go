package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type PlanoService interface {
	Criar(plano models.Plano) (models.Plano, error)
	Atualizar(plano models.Plano) (models.Plano, error)
	Listar(ativo *bool) ([]*models.Plano, error)
	BuscarPorId(id int) (*models.Plano, error)
	Desativar(id int) error
	Reativar(id int) error
}

type planoService struct {
	repository repositories.PlanoRepository
}

func NovoPlanoService(repository repositories.PlanoRepository) PlanoService {
	return &planoService{repository}
}

func (s *planoService) Criar(plano models.Plano) (models.Plano, error) {
	plano.Ativo = true
	return s.repository.Criar(plano)
}

func (s *planoService) Atualizar(plano models.Plano) (models.Plano, error) {
	return s.repository.Atualizar(plano)
}

func (s *planoService) Listar(ativo *bool) ([]*models.Plano, error) {
	return s.repository.Listar(ativo)
}

func (s *planoService) BuscarPorId(id int) (*models.Plano, error) {
	return s.repository.BuscarPorId(id)
}

func (s *planoService) Desativar(id int) error {
	return s.repository.Desativar(id)
}

func (s *planoService) Reativar(id int) error {
	return s.repository.Reativar(id)
}
