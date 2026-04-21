package services

import (
	"errors"
	"strings"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"gorm.io/gorm"
)

func rotaModuloAgenda(rota string) bool {
	return rota == "/clinicas/agenda" || strings.HasPrefix(rota, "/clinicas/agenda/")
}

func rotaModuloEquipe(rota string) bool {
	if rota == "/usuarios" || rota == "/clinicas/tipos-usuario" || rota == "/clinicas/usuarios" {
		return true
	}
	return strings.HasPrefix(rota, "/usuarios/")
}

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
	// Dono / admin global: bypass por papel (não usar nome "Administrador" — perfil dono da clínica usa esse nome e não pode liberar tudo para perfis de equipe).
	if err == nil && (tipoUsuario.Papel == rbac.PapelDono || tipoUsuario.Papel == rbac.PapelADMGeral) {
		return true, nil
	}

	// "Meus atendimentos": a tela /clinicas/atendimentos libera todas as rotas /clinicas/agenda* (mesma API).
	// Permissões granulares de agenda continuam exigidas rota a rota quando não houver /clinicas/atendimentos.
	if rotaModuloAgenda(rota) {
		okM, errM := s.permitidoEmRotaCatalogo(tipoUsuarioID, "/clinicas/atendimentos")
		if errM != nil {
			return false, errM
		}
		if okM {
			return true, nil
		}
	}

	// Equipe: rota simbólica /clinicas/equipe cobre /usuarios*, /clinicas/tipos-usuario e POST /clinicas/usuarios.
	if rotaModuloEquipe(rota) {
		okE, errE := s.permitidoEmRotaCatalogo(tipoUsuarioID, "/clinicas/equipe")
		if errE != nil {
			return false, errE
		}
		if okE {
			return true, nil
		}
	}

	// Listagem global de usuários da clínica (GET /usuarios): mesmo módulo que "criar usuário na clínica" (POST /clinicas/usuarios).
	if rota == "/usuarios" {
		ok, errU := s.permitidoEmRotaCatalogo(tipoUsuarioID, "/usuarios")
		if errU != nil {
			return false, errU
		}
		if ok {
			return true, nil
		}
		ok2, err2 := s.permitidoEmRotaCatalogo(tipoUsuarioID, "/clinicas/usuarios")
		if err2 != nil {
			return false, err2
		}
		if ok2 {
			return true, nil
		}
		return false, nil
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

func (s *permissaoTelaService) permitidoEmRotaCatalogo(tipoUsuarioID uint, rota string) (bool, error) {
	t, err := s.telaService.BuscarTelaPorRota(rota)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return s.repo.VerificarPermissao(tipoUsuarioID, t.ID)
}

func (s *permissaoTelaService) ListarRotasPermitidas(tipoUsuarioID uint) (rotas []string, acessoTotal bool, err error) {
	if tipoUsuarioID == 1 {
		return nil, true, nil
	}
	tipoUsuario, err := s.tipoUsuarioService.BuscarPorID(tipoUsuarioID)
	if err != nil {
		return nil, false, err
	}
	if tipoUsuario.Papel == rbac.PapelDono || tipoUsuario.Papel == rbac.PapelADMGeral {
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
	if _, ok := seen["/clinicas/usuarios"]; ok {
		if _, has := seen["/usuarios"]; !has {
			seen["/usuarios"] = struct{}{}
			rotas = append(rotas, "/usuarios")
		}
	}
	return rotas, false, nil
}
