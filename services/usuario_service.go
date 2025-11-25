package services

import (
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
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

	CriarUsuarioClinica(dto dto.CriarUsuarioClinicaDTO, clinicaID uint) (models.Usuario, error)
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

func (s *usuarioService) CriarUsuarioClinica(dto dto.CriarUsuarioClinicaDTO, clinicaID uint) (models.Usuario, error) {
	senhaHash, err := utils.HashSenha(dto.Senha)
	if err != nil {
		return models.Usuario{}, err
	}

	usuario := models.Usuario{
		Nome:          dto.Nome,
		Email:         dto.Email,
		Senha:         senhaHash,
		ClinicaID:     clinicaID,
		TipoUsuarioID: dto.TipoUsuarioID,
		Ativo:         true,
	}

	err = s.repo.CriarUsuario(&usuario)
	if err != nil {
		return models.Usuario{}, err
	}

	return usuario, nil
}
