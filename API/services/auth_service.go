package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/ferrariwill/Clinicas/API/internal/logger"
	"github.com/ferrariwill/Clinicas/API/internal/mail"
	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrCredenciaisInvalidas indica e-mail inexistente ou senha incorreta (mesma mensagem por segurança).
var ErrCredenciaisInvalidas = errors.New("credenciais inválidas")

// ErrEmailNaoCadastradoRecuperacao indica e-mail inexistente em "esqueci minha senha" (resposta genérica ao cliente).
var ErrEmailNaoCadastradoRecuperacao = errors.New("email não encontrado")

type AuthService interface {
	Login(email string, senha string) (*models.Usuario, error)
	AlterarSenha(usuarioID uint, senhaAtual string, novaSenha string) error
	GerarTokenRedifinicao(email string) error
	RedefinirSenha(token string, novaSenha string) error
	MinhasClinicas(usuarioID uint, papel string) ([]ClinicaAssociadaAuth, error)
	TrocarClinicaAtiva(usuarioID uint, clinicaID uint, papel string) (*models.Usuario, error)
}

// ClinicaAssociadaAuth item para listagem de clínicas acessíveis ao usuário autenticado.
type ClinicaAssociadaAuth struct {
	ClinicaID     uint   `json:"clinica_id"`
	Nome          string `json:"nome"`
	Email         string `json:"email"`
	TipoUsuarioID uint   `json:"tipo_usuario_id"`
	Papel         string `json:"papel"`
}

type authService struct {
	usuarioRepo   repositories.UsuarioRepository
	usuarioUCRepo repositories.UsuarioClinicaRepository
	tipoUsuario   repositories.TipoUsuarioRepository
	clinicaRepo   repositories.ClinicaRepository
	tokenRepo     repositories.TokenRepository
	mailer        *mail.Mailer
}

func NovoAuthService(
	usuarioRepo repositories.UsuarioRepository,
	usuarioUCRepo repositories.UsuarioClinicaRepository,
	tipoUsuario repositories.TipoUsuarioRepository,
	clinicaRepo repositories.ClinicaRepository,
	token repositories.TokenRepository,
	mailer *mail.Mailer,
) AuthService {
	return &authService{
		usuarioRepo:   usuarioRepo,
		usuarioUCRepo: usuarioUCRepo,
		tipoUsuario:   tipoUsuario,
		clinicaRepo:   clinicaRepo,
		tokenRepo:     token,
		mailer:        mailer,
	}
}

func (s *authService) Login(email string, senha string) (*models.Usuario, error) {
	usuario, err := s.usuarioRepo.BuscarPorEmail(email)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logLoginFailed(email)
			return nil, ErrCredenciaisInvalidas
		}
		return nil, err
	}

	if !utils.VerificarSenha(senha, usuario.Senha) {
		s.logLoginFailed(email)
		return nil, ErrCredenciaisInvalidas
	}

	if err := s.aplicarContextoClinicaNoLogin(usuario); err != nil {
		return nil, err
	}

	return usuario, nil
}

func (s *authService) aplicarContextoClinicaNoLogin(usuario *models.Usuario) error {
	assocs, err := s.usuarioUCRepo.ListarPorUsuario(usuario.ID)
	if err != nil {
		return err
	}
	if len(assocs) == 0 {
		return nil
	}
	var pick *models.UsuarioClinica
	for i := range assocs {
		a := &assocs[i]
		if a.ClinicaID == usuario.ClinicaID && a.TipoUsuarioID == usuario.TipoUsuarioID {
			pick = a
			break
		}
	}
	if pick == nil {
		pick = &assocs[0]
	}
	usuario.ClinicaID = pick.ClinicaID
	usuario.TipoUsuarioID = pick.TipoUsuarioID
	tipo, err := s.tipoUsuario.BuscarPorID(pick.TipoUsuarioID)
	if err != nil {
		return err
	}
	usuario.TipoUsuario = *tipo
	if err := s.usuarioRepo.AtualizarClinicaAtiva(usuario.ID, pick.ClinicaID, pick.TipoUsuarioID); err != nil {
		return err
	}
	return nil
}

func (s *authService) MinhasClinicas(usuarioID uint, papel string) ([]ClinicaAssociadaAuth, error) {
	if papel == rbac.PapelADMGeral {
		so := true
		list, err := s.clinicaRepo.ListarClinicas(&so)
		if err != nil {
			return nil, err
		}
		u, err := s.usuarioRepo.BuscarPorID(usuarioID)
		if err != nil {
			return nil, err
		}
		out := make([]ClinicaAssociadaAuth, 0, len(list))
		for _, c := range list {
			if c == nil {
				continue
			}
			out = append(out, ClinicaAssociadaAuth{
				ClinicaID:     c.ID,
				Nome:          c.Nome,
				Email:         c.EmailResponsavel,
				TipoUsuarioID: u.TipoUsuarioID,
				Papel:         papel,
			})
		}
		return out, nil
	}
	assocs, err := s.usuarioUCRepo.ListarPorUsuario(usuarioID)
	if err != nil {
		return nil, err
	}
	out := make([]ClinicaAssociadaAuth, 0, len(assocs))
	for _, a := range assocs {
		p := ""
		if a.TipoUsuario.Papel != "" {
			p = a.TipoUsuario.Papel
		}
		em := ""
		if a.Clinica.ID != 0 {
			em = a.Clinica.EmailResponsavel
		}
		nome := a.Clinica.Nome
		if nome == "" && a.ClinicaID != 0 {
			c, err := s.clinicaRepo.BuscarPorId(a.ClinicaID)
			if err == nil && c != nil {
				nome = c.Nome
				em = c.EmailResponsavel
			}
		}
		out = append(out, ClinicaAssociadaAuth{
			ClinicaID:     a.ClinicaID,
			Nome:          nome,
			Email:         em,
			TipoUsuarioID: a.TipoUsuarioID,
			Papel:         p,
		})
	}
	return out, nil
}

func (s *authService) TrocarClinicaAtiva(usuarioID uint, clinicaID uint, papel string) (*models.Usuario, error) {
	u, err := s.usuarioRepo.BuscarPorID(usuarioID)
	if err != nil {
		return nil, err
	}
	if papel == rbac.PapelADMGeral {
		if _, err := s.clinicaRepo.BuscarPorId(clinicaID); err != nil {
			return nil, errors.New("clínica não encontrada")
		}
		if err := s.usuarioRepo.AtualizarClinicaAtiva(usuarioID, clinicaID, u.TipoUsuarioID); err != nil {
			return nil, err
		}
		return s.usuarioRepo.BuscarPorID(usuarioID)
	}
	uc, err := s.usuarioUCRepo.ObterAtivoPorUsuarioEClinica(usuarioID, clinicaID)
	if err != nil {
		return nil, errors.New("você não tem acesso a esta clínica")
	}
	if _, err := s.tipoUsuario.BuscarPorIDClinica(uc.TipoUsuarioID, clinicaID); err != nil {
		return nil, errors.New("tipo de usuário inválido para esta clínica")
	}
	if err := s.usuarioRepo.AtualizarClinicaAtiva(usuarioID, clinicaID, uc.TipoUsuarioID); err != nil {
		return nil, err
	}
	return s.usuarioRepo.BuscarPorID(usuarioID)
}

func (s *authService) AlterarSenha(usuarioId uint, senhaAtual string, novaSenha string) error {
	usuario, err := s.usuarioRepo.BuscarPorID(usuarioId)

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

func (s *authService) logLoginFailed(email string) {
	logger.L.LogAttrs(context.Background(), slog.LevelWarn, "auth_login",
		slog.String("event", "credenciais_invalidas"),
		slog.String("email_domain", logger.EmailDomain(email)),
	)
}

// GerarTokenRedifinicao gera senha provisória, marca obrigatoriedade de troca e envia e-mail (mesmo fluxo do primeiro acesso).
func (s *authService) GerarTokenRedifinicao(email string) error {
	emailNorm := utils.NormalizarEmail(strings.TrimSpace(email))
	if emailNorm == "" {
		return ErrEmailNaoCadastradoRecuperacao
	}

	cid := uuid.NewString()
	ctx := context.Background()
	domain := logger.EmailDomain(emailNorm)

	logger.L.LogAttrs(ctx, slog.LevelInfo, "recuperacao_senha",
		slog.String("event", "inicio"),
		slog.String("correlation_id", cid),
		slog.String("email_domain", domain),
	)

	usuario, err := s.usuarioRepo.BuscarPorEmail(emailNorm)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			logger.L.LogAttrs(ctx, slog.LevelInfo, "recuperacao_senha",
				slog.String("event", "email_nao_cadastrado"),
				slog.String("correlation_id", cid),
				slog.String("email_domain", domain),
			)
			return ErrEmailNaoCadastradoRecuperacao
		}
		logger.L.LogAttrs(ctx, slog.LevelError, "recuperacao_senha",
			slog.String("event", "db_buscar_usuario_falhou"),
			slog.String("correlation_id", cid),
			slog.String("email_domain", domain),
			slog.Any("error", err),
		)
		return fmt.Errorf("consultar usuário: %w", err)
	}

	emailNoBanco := utils.NormalizarEmail(strings.TrimSpace(usuario.Email))
	if emailNoBanco != emailNorm {
		logger.L.LogAttrs(ctx, slog.LevelWarn, "recuperacao_senha",
			slog.String("event", "email_db_difere_do_canonico"),
			slog.String("correlation_id", cid),
			slog.Uint64("usuario_id", uint64(usuario.ID)),
			slog.String("email_domain", domain),
		)
	}
	// Sempre envia para o endereço canônico da solicitação (igual ao login), evitando RCPT com espaços/casing divergentes do campo no banco.
	destinatario := emailNorm

	plain := utils.SenhaAleatoria(14)
	hash, err := utils.HashSenha(plain)
	if err != nil {
		logger.L.LogAttrs(ctx, slog.LevelError, "recuperacao_senha",
			slog.String("event", "hash_senha_falhou"),
			slog.String("correlation_id", cid),
			slog.Uint64("usuario_id", uint64(usuario.ID)),
		)
		return err
	}

	senhaAnterior := usuario.Senha
	obrigarAnterior := usuario.ObrigarTrocaSenha

	if err := s.usuarioRepo.DefinirSenhaEFlagTroca(usuario.ID, hash, true); err != nil {
		logger.L.LogAttrs(ctx, slog.LevelError, "recuperacao_senha",
			slog.String("event", "db_atualizar_senha_falhou"),
			slog.String("correlation_id", cid),
			slog.Uint64("usuario_id", uint64(usuario.ID)),
			slog.Any("error", err),
		)
		return err
	}
	logger.L.LogAttrs(ctx, slog.LevelInfo, "recuperacao_senha",
		slog.String("event", "db_senha_provisoria_gravada"),
		slog.String("correlation_id", cid),
		slog.Uint64("usuario_id", uint64(usuario.ID)),
		slog.String("email_domain", domain),
	)

	if s.mailer == nil {
		if os.Getenv("LOG_TEMP_PASSWORD") == "true" {
			logger.L.LogAttrs(ctx, slog.LevelWarn, "recuperacao_senha",
				slog.String("event", "sem_smtp_senha_no_log_dev"),
				slog.String("correlation_id", cid),
				slog.String("email", destinatario),
				slog.String("senha_provisoria", plain),
			)
		} else {
			logger.L.LogAttrs(ctx, slog.LevelWarn, "recuperacao_senha",
				slog.String("event", "sem_smtp"),
				slog.String("correlation_id", cid),
				slog.Uint64("usuario_id", uint64(usuario.ID)),
				slog.String("email_domain", domain),
				slog.String("hint", "configure SMTP ou LOG_TEMP_PASSWORD=true (só dev)"),
			)
		}
		return nil
	}

	base := strings.TrimSpace(os.Getenv("APP_PUBLIC_URL"))
	if base == "" {
		base = "http://localhost:3000"
	}
	subject := "Recuperação de senha — Facilita Clin"
	body := fmt.Sprintf(`Olá, %s.

Foi solicitada uma nova senha para sua conta.

E-mail: %s
Senha provisória: %s

Faça login no sistema. Será obrigatório definir uma nova senha após o acesso.

Link: %s/login
`, usuario.Nome, destinatario, plain, strings.TrimRight(base, "/"))

	logger.L.LogAttrs(ctx, slog.LevelInfo, "recuperacao_senha",
		slog.String("event", "smtp_enviar_inicio"),
		slog.String("correlation_id", cid),
		slog.Uint64("usuario_id", uint64(usuario.ID)),
		slog.String("email_domain", domain),
	)
	if err := s.mailer.Send(destinatario, subject, strings.TrimSpace(body)); err != nil {
		logger.L.LogAttrs(ctx, slog.LevelError, "recuperacao_senha",
			slog.String("event", "smtp_falhou_rollback_senha"),
			slog.String("correlation_id", cid),
			slog.Uint64("usuario_id", uint64(usuario.ID)),
			slog.String("email_domain", domain),
			slog.Any("error", err),
		)
		if rbErr := s.usuarioRepo.DefinirSenhaEFlagTroca(usuario.ID, senhaAnterior, obrigarAnterior); rbErr != nil {
			logger.L.LogAttrs(ctx, slog.LevelError, "recuperacao_senha",
				slog.String("event", "rollback_senha_critico"),
				slog.String("correlation_id", cid),
				slog.Uint64("usuario_id", uint64(usuario.ID)),
				slog.Any("error", rbErr),
			)
		} else {
			logger.L.LogAttrs(ctx, slog.LevelInfo, "recuperacao_senha",
				slog.String("event", "rollback_senha_ok"),
				slog.String("correlation_id", cid),
				slog.Uint64("usuario_id", uint64(usuario.ID)),
			)
		}
		return fmt.Errorf("erro ao enviar e-mail: %w", err)
	}
	logger.L.LogAttrs(ctx, slog.LevelInfo, "recuperacao_senha",
		slog.String("event", "smtp_ok"),
		slog.String("correlation_id", cid),
		slog.Uint64("usuario_id", uint64(usuario.ID)),
		slog.String("email_domain", domain),
	)
	return nil
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
