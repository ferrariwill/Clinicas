package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type TipoUsuarioService interface {
	Criar(tu *models.TipoUsuario) error
	ListarPorClinica(clinicaID uint) ([]models.TipoUsuario, error)
	BuscarPorID(id uint) (*models.TipoUsuario, error)
	Atualizar(tu *models.TipoUsuario) error
	Desativar(id uint) error
	Reativar(id uint) error
}

type tipoUsuarioService struct {
	repo repositories.TipoUsuarioRepository
}

func NovoTipoUsuarioService(repo repositories.TipoUsuarioRepository) TipoUsuarioService {
	return &tipoUsuarioService{repo}
}

func (s *tipoUsuarioService) Criar(tu *models.TipoUsuario) error {
	return s.repo.CriarTipoUsuario(tu)
}

func (s *tipoUsuarioService) ListarPorClinica(clinicaID uint) ([]models.TipoUsuario, error) {
	return s.repo.ListarPorClinica(clinicaID)
}

func (s *tipoUsuarioService) BuscarPorID(id uint) (*models.TipoUsuario, error) {
	return s.repo.BuscarPorID(id)
}

func (s *tipoUsuarioService) Atualizar(tu *models.TipoUsuario) error {
	return s.repo.Atualizar(tu)
}

func (s *tipoUsuarioService) Desativar(id uint) error {
	return s.repo.Desativar(id)
}

func (s *tipoUsuarioService) Reativar(id uint) error {
	return s.repo.Reativar(id)
}
