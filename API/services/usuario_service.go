package services

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"unicode/utf8"

	"github.com/ferrariwill/Clinicas/API/internal/mail"
	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
	"gorm.io/gorm"
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
	u.Nome = strings.TrimSpace(u.Nome)
	if u.Nome == "" {
		return errors.New("informe o nome do usuário")
	}
	if utf8.RuneCountInString(u.Nome) < 2 {
		return errors.New("o nome deve ter pelo menos 2 caracteres")
	}
	u.Email = utils.NormalizarEmail(u.Email)
	if u.Email == "" {
		return errors.New("e-mail inválido")
	}
	u.ClinicaID = clinicaId
	u.Ativo = true

	plain := strings.TrimSpace(u.Senha)
	obrigar := false
	if plain == "" {
		plain = utils.SenhaAleatoria(14)
		obrigar = true
	}
	u.ObrigarTrocaSenha = obrigar

	hash, err := utils.HashSenha(plain)
	if err != nil {
		return err
	}
	u.Senha = hash

	ex, errEx := s.repo.BuscarPorEmail(u.Email)
	if errEx == nil && ex != nil && ex.ID > 0 {
		if ex.Ativo {
			return errors.New("já existe um usuário ativo cadastrado com este e-mail")
		}
		ex.Nome = u.Nome
		ex.Email = u.Email
		ex.Senha = hash
		ex.ClinicaID = clinicaId
		ex.TipoUsuarioID = u.TipoUsuarioID
		ex.Ativo = true
		ex.ObrigarTrocaSenha = obrigar
		if err := s.repo.AtualizarUsuario(ex); err != nil {
			return err
		}
		*u = *ex
		if err := s.ucRepo.GarantirVinculoAtivo(ex.ID, clinicaId, u.TipoUsuarioID); err != nil {
			return err
		}
		_, errMail := s.enviarEmailAcessoEquipe(ex.Email, ex.Nome, plain, obrigar)
		return errMail
	}
	if errEx != nil && !errors.Is(errEx, gorm.ErrRecordNotFound) {
		return errEx
	}

	if err := s.repo.CriarUsuario(u); err != nil {
		return err
	}
	if err := s.ucRepo.Criar(&models.UsuarioClinica{
		UsuarioID:     u.ID,
		ClinicaID:     clinicaId,
		TipoUsuarioID: u.TipoUsuarioID,
		Ativo:         true,
	}); err != nil {
		return err
	}
	_, errMail := s.enviarEmailAcessoEquipe(u.Email, u.Nome, plain, obrigar)
	return errMail
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
	emailNorm := utils.NormalizarEmail(dto.Email)
	if emailNorm == "" {
		return models.Usuario{}, false, errors.New("e-mail inválido")
	}

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

	existing, errEx := s.repo.BuscarPorEmail(emailNorm)
	if errEx == nil && existing != nil && existing.ID > 0 {
		if existing.Ativo {
			return models.Usuario{}, false, errors.New("já existe um usuário ativo cadastrado com este e-mail")
		}
		existing.Nome = strings.TrimSpace(dto.Nome)
		existing.Email = emailNorm
		existing.Senha = senhaHash
		existing.ClinicaID = clinicaID
		existing.TipoUsuarioID = dto.TipoUsuarioID
		existing.Ativo = true
		existing.ObrigarTrocaSenha = obrigar
		if err := s.repo.AtualizarUsuario(existing); err != nil {
			return models.Usuario{}, false, err
		}
		if err := s.ucRepo.GarantirVinculoAtivo(existing.ID, clinicaID, dto.TipoUsuarioID); err != nil {
			return models.Usuario{}, false, err
		}
		u := *existing
		enviado, errMail := s.enviarEmailAcessoEquipe(emailNorm, dto.Nome, plain, obrigar)
		if errMail != nil {
			return u, false, errMail
		}
		return u, enviado, nil
	}
	if errEx != nil && !errors.Is(errEx, gorm.ErrRecordNotFound) {
		return models.Usuario{}, false, errEx
	}

	usuario := models.Usuario{
		Nome:              strings.TrimSpace(dto.Nome),
		Email:             emailNorm,
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

	enviado, errMail := s.enviarEmailAcessoEquipe(emailNorm, dto.Nome, plain, obrigar)
	if errMail != nil {
		return usuario, false, errMail
	}
	return usuario, enviado, nil
}

// enviarEmailAcessoEquipe envia credenciais com o mesmo casing cadastrado (e-mail normalizado em minúsculas; senha exata).
func (s *usuarioService) enviarEmailAcessoEquipe(emailCadastro, nome, senhaPlana string, obrigar bool) (bool, error) {
	if !obrigar {
		return false, nil
	}
	if s.mailer == nil {
		if os.Getenv("LOG_TEMP_PASSWORD") == "true" {
			log.Printf("[CLÍNICAS] Novo usuário da equipe sem SMTP. E-mail=%s senha provisória=%s", emailCadastro, senhaPlana)
		} else {
			log.Printf("[CLÍNICAS] Novo usuário %s criado sem envio de e-mail (configure SMTP ou LOG_TEMP_PASSWORD=true em dev).", emailCadastro)
		}
		return false, nil
	}
	base := strings.TrimSpace(os.Getenv("APP_PUBLIC_URL"))
	if base == "" {
		base = "http://localhost:3000"
	}
	subject := "Acesso à equipe — Sistema Clínicas"
	body := fmt.Sprintf(`Olá, %s.

Sua conta na equipe da clínica foi criada (ou reativada).

E-mail de acesso: %s
Senha provisória: %s

No primeiro acesso será obrigatório definir uma nova senha.

Acesse: %s/login
`, nome, emailCadastro, senhaPlana, strings.TrimRight(base, "/"))
	if err := s.mailer.Send(emailCadastro, subject, strings.TrimSpace(body)); err != nil {
		return false, fmt.Errorf("usuário salvo mas falha ao enviar e-mail: %w", err)
	}
	return true, nil
}
