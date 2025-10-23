package services

import (
	"errors"
	"time"

	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
	"github.com/ferrariwill/Clinicas/utils"
)

type AuthService interface {
	Login(email string, senha string) (*models.Usuario, error)
	AlterarSenha(usuarioID uint, senhaAtual string, novaSenha string) error
	GerarTokenRedifinicao(email string) error
	RedefinirSenha(token string, novaSenha string) error
}

type authService struct {
	usuarioRepo repositories.UsuarioRepository
	tokenRepo   repositories.TokenRepository
}

func NovoAuthService(usuario repositories.UsuarioRepository, token repositories.TokenRepository) AuthService {
	return &authService{usuario, token}
}

func (s *authService) Login(email string, senha string) (*models.Usuario, error) {
	usuario, err := s.usuarioRepo.BuscarPorEmail(email)

	if err != nil {
		return nil, err
	}

	if !utils.VerificarSenha(senha, usuario.Senha) {
		return nil, errors.New("senha inválida")
	}

	return usuario, nil
}

func (s *authService) AlterarSenha(usuarioId uint, senhaAtual string, novaSenha string) error {
	usuario, err := s.usuarioRepo.BuscarUsuarioPorId(usuarioId)

	if err != nil {
		return err
	}

	if !utils.VerificarSenha(senhaAtual, usuario.Senha) {
		return errors.New("senha inválida")
	}

	hash, err := utils.HashSenha(novaSenha)
	if err != nil {
		return err
	}

	return s.usuarioRepo.AtualizarSenha(usuarioId, hash)
}

func (s *authService) GerarTokenRedifinicao(email string) error {
	_, err := s.usuarioRepo.BuscarPorEmail(email)
	if err != nil {
		return errors.New("email não encontrado")
	}

	token := utils.GerarUUID()
	t := models.TokenRedifinicao{
		Email:     email,
		Token:     token,
		Expiracao: time.Now().Add(30 * time.Minute),
		Ativo:     true,
	}

	return s.tokenRepo.SalvarToken(t)
}

func (s *authService) RedefinirSenha(token, novaSenha string) error {
	t, err := s.tokenRepo.BuscarToken(token)
	if err != nil {
		return err
	}

	usuario, err := s.usuarioRepo.BuscarPorEmail(t.Email)
	if err != nil {
		return err
	}

	hash, _ := utils.HashSenha(novaSenha)
	err = s.usuarioRepo.AtualizarSenha(usuario.ID, hash)
	if err != nil {
		return err
	}

	return s.tokenRepo.MarcarComoUsado(token)
}
