package services

import (
	"errors"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"gorm.io/gorm"
)

type PermissaoTelaService interface {
	AssociarTela(tipoUsuarioID, telaID uint) error
	DesassociarTela(tipoUsuarioID, telaID uint) error
	ListarTelasPorTipoUsuario(tipoUsuarioID uint) ([]models.PermissaoTela, error)
	ListarTiposUsuarioPorTela(telaID uint) ([]models.PermissaoTela, error)
	VerificarPermissao(tipoUsuarioID, telaID uint) (bool, error)
	VerificarPermissaoTipoUsuario(tipoUsuarioID uint, rota string) (bool, error)
	// ListarRotasPermitidas retorna rotas da API (FullPath) permitidas ao tipo; acessoTotal indica bypass (dono, admin global, etc.).
	ListarRotasPermitidas(tipoUsuarioID uint) (rotas []string, acessoTotal bool, err error)
}

type permissaoTelaService struct {
	repo               repositories.PermissaoTelaRepository
	telaService        TelaService
	tipoUsuarioService TipoUsuarioService
}

func NovoPermissaoTelaService(repo repositories.PermissaoTelaRepository, telaService TelaService, tipoUsuarioService TipoUsuarioService) PermissaoTelaService {
	return &permissaoTelaService{repo: repo, telaService: telaService, tipoUsuarioService: tipoUsuarioService}
}

func (s *permissaoTelaService) AssociarTela(tipoUsuarioID, telaID uint) error {
	permissao := &models.PermissaoTela{
		TipoUsuarioID: tipoUsuarioID,
		TelaID:        telaID,
	}
	return s.repo.Criar(permissao)
}

func (s *permissaoTelaService) DesassociarTela(tipoUsuarioID, telaID uint) error {
	return s.repo.Remover(tipoUsuarioID, telaID)
}

func (s *permissaoTelaService) ListarTelasPorTipoUsuario(tipoUsuarioID uint) ([]models.PermissaoTela, error) {
	return s.repo.ListarPorTipoUsuario(tipoUsuarioID)
}

func (s *permissaoTelaService) ListarTiposUsuarioPorTela(telaID uint) ([]models.PermissaoTela, error) {
	return s.repo.ListarPorTela(telaID)
}

func (s *permissaoTelaService) VerificarPermissao(tipoUsuarioID, telaID uint) (bool, error) {
	return s.repo.VerificarPermissao(tipoUsuarioID, telaID)
}

func (s *permissaoTelaService) VerificarPermissaoTipoUsuario(tipoUsuarioID uint, rota string) (bool, error) {
	// Admin geral (tipo_usuario_id = 1) tem acesso a tudo
	if tipoUsuarioID == 1 {
		return true, nil
	}

	tipoUsuario, err := s.tipoUsuarioService.BuscarPorID(tipoUsuarioID)
	if err == nil && tipoUsuario.Nome == "Administrador" {
		return true, nil
	}
	// Dono da clínica: acesso total às rotas da API (perfis de equipe usam permissões granulares)
	if err == nil && tipoUsuario.Papel == rbac.PapelDono {
		return true, nil
	}

	tela, errTela := s.telaService.BuscarTelaPorRota(rota)
	if errTela != nil {
		if errors.Is(errTela, gorm.ErrRecordNotFound) {
			// Rota sem entrada no catálogo: não aplica permissão por tela (evita bloquear o sistema inteiro).
			return true, nil
		}
		return false, errTela
	}

	return s.repo.VerificarPermissao(tipoUsuarioID, tela.ID)
}

func (s *permissaoTelaService) ListarRotasPermitidas(tipoUsuarioID uint) (rotas []string, acessoTotal bool, err error) {
	if tipoUsuarioID == 1 {
		return nil, true, nil
	}
	tipoUsuario, err := s.tipoUsuarioService.BuscarPorID(tipoUsuarioID)
	if err != nil {
		return nil, false, err
	}
	if tipoUsuario.Nome == "Administrador" || tipoUsuario.Papel == rbac.PapelDono {
		return nil, true, nil
	}
	perms, err := s.repo.ListarPorTipoUsuario(tipoUsuarioID)
	if err != nil {
		return nil, false, err
	}
	seen := make(map[string]struct{})
	for _, p := range perms {
		if p.Tela.ID == 0 || !p.Tela.Ativo || p.Tela.Rota == "" {
			continue
		}
		if _, ok := seen[p.Tela.Rota]; ok {
			continue
		}
		seen[p.Tela.Rota] = struct{}{}
		rotas = append(rotas, p.Tela.Rota)
	}
	return rotas, false, nil
}
