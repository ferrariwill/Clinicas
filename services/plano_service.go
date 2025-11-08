package services

import (
	"errors"
	"fmt"

	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
	"github.com/ferrariwill/Clinicas/utils"
	"gorm.io/gorm"
)

type PlanoService interface {
	Criar(plano models.Plano) (models.Plano, error)
	Atualizar(id uint, plano models.Plano) (models.Plano, error)
	Listar(ativo *bool) ([]*models.Plano, error)
	BuscarPorId(id int) (*models.Plano, error)
	BuscarPorNome(nome string) (*models.Plano, error)
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
	nomeNormalizado := utils.NormalizarNome(plano.Nome)
	_, err := s.BuscarPorNome(nomeNormalizado)

	if err == nil {
		return models.Plano{}, fmt.Errorf("já existe um plano com esse nome")
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Plano{}, err
	}

	return s.repository.Criar(plano)
}

func (s *planoService) Atualizar(id uint, plano models.Plano) (models.Plano, error) {
	return s.repository.Atualizar(id, plano)
}

func (s *planoService) Listar(ativo *bool) ([]*models.Plano, error) {
	return s.repository.Listar(ativo)
}

func (s *planoService) BuscarPorId(id int) (*models.Plano, error) {
	return s.repository.BuscarPorId(id)
}

func (s *planoService) BuscarPorNome(nome string) (*models.Plano, error) {
	return s.repository.BuscarPorNome(nome)
}

func (s *planoService) Desativar(id int) error {
	return s.repository.Desativar(id)
}

func (s *planoService) Reativar(id int) error {
	return s.repository.Reativar(id)
}
