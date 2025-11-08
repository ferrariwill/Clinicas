package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type AssinaturaService interface {
	Criar(assinatura *models.Assinatura) error
	Atualizar(assinatura *models.Assinatura) error
	Listar(ativo *bool) ([]models.Assinatura, error)
	Consultar(clinicaID *uint, planoID *uint) (*[]models.Assinatura, error)
	Desativar(id int) error
	Reativar(id int) error
}

type assinaturaService struct {
	repo repositories.AssinaturaRepository
}

func NovaAssinaturaService(assinaturaRepository repositories.AssinaturaRepository) AssinaturaService {
	return &assinaturaService{assinaturaRepository}
}

func (s *assinaturaService) Criar(assinatura *models.Assinatura) error {
	return s.repo.Criar(assinatura)
}

func (s *assinaturaService) Atualizar(assinatura *models.Assinatura) error {
	return s.repo.Atualizar(assinatura)
}

func (s *assinaturaService) Listar(ativo *bool) ([]models.Assinatura, error) {
	return s.repo.Listar(ativo)
}

func (s *assinaturaService) Consultar(clinicaID *uint, planoID *uint) (*[]models.Assinatura, error) {
	return s.repo.Consultar(clinicaID, planoID)
}

func (s *assinaturaService) Desativar(id int) error {
	return s.repo.Desativar(id)
}

func (s *assinaturaService) Reativar(id int) error {
	return s.repo.Reativar(id)
}
