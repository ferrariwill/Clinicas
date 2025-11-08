package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
	"github.com/ferrariwill/Clinicas/utils"
)

type UsuarioService interface {
	CriarUsuario(u *models.Usuario, clinicaId uint) error
	ListarPorClinica(clinicaId uint, soAtivos *bool) ([]models.Usuario, error)
	Listar(ativo *bool) ([]models.Usuario, error)
	BuscarPorID(id uint) (*models.Usuario, error)
	AtualizarUsuario(u *models.Usuario) error
	DesativarUsuario(id uint) error
	ReativarUsuario(id uint) error
}

type usuarioService struct {
	repo repositories.UsuarioRepository
}

func NovoUsuarioService(repo repositories.UsuarioRepository) UsuarioService {
	return &usuarioService{repo}
}

func (s *usuarioService) CriarUsuario(u *models.Usuario, clinicaId uint) error {
	u.ClinicaID = clinicaId
	u.Ativo = true
	hash, _ := utils.HashSenha(u.Senha)
	u.Senha = hash
	return s.repo.CriarUsuario(u)
}

func (s *usuarioService) ListarPorClinica(clinicaId uint, soAtivos *bool) ([]models.Usuario, error) {
	return s.repo.ListarPorClinica(clinicaId, soAtivos)
}

func (s *usuarioService) BuscarPorID(id uint) (*models.Usuario, error) {
	return s.repo.BuscarPorID(id)
}

func (s *usuarioService) AtualizarUsuario(u *models.Usuario) error {
	return s.repo.AtualizarUsuario(u)
}

func (s *usuarioService) DesativarUsuario(id uint) error {
	return s.repo.DesativarUsuario(id)
}

func (s *usuarioService) ReativarUsuario(id uint) error {
	return s.repo.ReativarUsuario(id)
}

func (s *usuarioService) Listar(ativo *bool) ([]models.Usuario, error) {
	return s.repo.ListarUsuarios(ativo)
}
