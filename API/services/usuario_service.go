package services

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/ferrariwill/Clinicas/API/internal/mail"
	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
)

type UsuarioService interface {
	CriarUsuario(u *models.Usuario, clinicaId uint) error
	ListarPorClinica(clinicaId uint, soAtivos *bool) ([]models.Usuario, error)
	Listar(ativo *bool) ([]models.Usuario, error)
	BuscarPorID(id uint) (*models.Usuario, error)
	AtualizarUsuario(u *models.Usuario) error
	DesativarUsuario(id uint) error
	ReativarUsuario(id uint) error
	PertenceAClinica(usuarioID, clinicaID uint) (bool, error)
	BuscarTipoNaClinica(usuarioID, clinicaID uint) (uint, error)
	AtualizarTipoUsuarioNaClinica(usuarioID, clinicaID, tipoUsuarioID uint) error

	CriarUsuarioClinica(dto dto.CriarUsuarioClinicaDTO, clinicaID uint) (models.Usuario, bool, error)
}

type usuarioService struct {
	repo    repositories.UsuarioRepository
	ucRepo  repositories.UsuarioClinicaRepository
	mailer  *mail.Sender
}

func NovoUsuarioService(repo repositories.UsuarioRepository, ucRepo repositories.UsuarioClinicaRepository, mailer *mail.Sender) UsuarioService {
	return &usuarioService{repo: repo, ucRepo: ucRepo, mailer: mailer}
}

func (s *usuarioService) CriarUsuario(u *models.Usuario, clinicaId uint) error {
	u.ClinicaID = clinicaId
	u.Ativo = true
	u.ObrigarTrocaSenha = false
	hash, _ := utils.HashSenha(u.Senha)
	u.Senha = hash
	if err := s.repo.CriarUsuario(u); err != nil {
		return err
	}
	return s.ucRepo.Criar(&models.UsuarioClinica{
		UsuarioID:     u.ID,
		ClinicaID:     clinicaId,
		TipoUsuarioID: u.TipoUsuarioID,
		Ativo:         true,
	})
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

func (s *usuarioService) PertenceAClinica(usuarioID, clinicaID uint) (bool, error) {
	return s.ucRepo.UsuarioTemAssociacaoAtiva(usuarioID, clinicaID)
}

func (s *usuarioService) BuscarTipoNaClinica(usuarioID, clinicaID uint) (uint, error) {
	uc, err := s.ucRepo.ObterAtivoPorUsuarioEClinica(usuarioID, clinicaID)
	if err != nil {
		return 0, err
	}
	return uc.TipoUsuarioID, nil
}

func (s *usuarioService) AtualizarTipoUsuarioNaClinica(usuarioID, clinicaID, tipoUsuarioID uint) error {
	if err := s.ucRepo.AtualizarTipo(usuarioID, clinicaID, tipoUsuarioID); err != nil {
		return err
	}
	ex, err := s.repo.BuscarPorID(usuarioID)
	if err != nil {
		return err
	}
	if ex.ClinicaID == clinicaID {
		return s.repo.AtualizarClinicaAtiva(usuarioID, clinicaID, tipoUsuarioID)
	}
	return nil
}

func (s *usuarioService) CriarUsuarioClinica(dto dto.CriarUsuarioClinicaDTO, clinicaID uint) (models.Usuario, bool, error) {
	var plain string
	var obrigar bool
	if dto.Senha != nil && strings.TrimSpace(*dto.Senha) != "" {
		plain = strings.TrimSpace(*dto.Senha)
		obrigar = false
	} else {
		plain = utils.SenhaAleatoria(14)
		obrigar = true
	}

	senhaHash, err := utils.HashSenha(plain)
	if err != nil {
		return models.Usuario{}, false, err
	}

	usuario := models.Usuario{
		Nome:              dto.Nome,
		Email:             dto.Email,
		Senha:             senhaHash,
		ClinicaID:         clinicaID,
		TipoUsuarioID:     dto.TipoUsuarioID,
		Ativo:             true,
		ObrigarTrocaSenha: obrigar,
	}

	err = s.repo.CriarUsuario(&usuario)
	if err != nil {
		return models.Usuario{}, false, err
	}
	if err := s.ucRepo.Criar(&models.UsuarioClinica{
		UsuarioID:     usuario.ID,
		ClinicaID:     clinicaID,
		TipoUsuarioID: usuario.TipoUsuarioID,
		Ativo:         true,
	}); err != nil {
		return models.Usuario{}, false, err
	}

	emailEnviado := false
	if obrigar {
		if s.mailer == nil {
			if os.Getenv("LOG_TEMP_PASSWORD") == "true" {
				log.Printf("[CLÍNICAS] Novo usuário da equipe sem SMTP. E-mail=%s senha provisória=%s", dto.Email, plain)
			} else {
				log.Printf("[CLÍNICAS] Novo usuário %s criado sem envio de e-mail (configure SMTP ou LOG_TEMP_PASSWORD=true em dev).", dto.Email)
			}
			return usuario, false, nil
		}
		base := strings.TrimSpace(os.Getenv("APP_PUBLIC_URL"))
		if base == "" {
			base = "http://localhost:3000"
		}
		subject := "ACESSO À EQUIPE — SISTEMA CLÍNICAS"
		body := strings.ToUpper(fmt.Sprintf(`
OLÁ, %s.

SUA CONTA NA EQUIPE DA CLÍNICA FOI CRIADA.

E-MAIL DE ACESSO: %s
SENHA PROVISÓRIA: %s

NO PRIMEIRO ACESSO SERÁ OBRIGATÓRIO DEFINIR UMA NOVA SENHA.

ACESSE: %s/login
`, dto.Nome, dto.Email, plain, strings.TrimRight(base, "/")))
		if err := s.mailer.Send(dto.Email, subject, strings.TrimSpace(body)); err != nil {
			return usuario, false, fmt.Errorf("usuário criado mas falha ao enviar e-mail: %w", err)
		}
		emailEnviado = true
	}

	return usuario, emailEnviado, nil
}
