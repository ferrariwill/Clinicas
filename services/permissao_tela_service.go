package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type PermissaoTelaService interface {
	AssociarTela(tipoUsuarioID, telaID uint) error
	DesassociarTela(tipoUsuarioID, telaID uint) error
	ListarTelasPorTipoUsuario(tipoUsuarioID uint) ([]models.PermissaoTela, error)
	ListarTiposUsuarioPorTela(telaID uint) ([]models.PermissaoTela, error)
	VerificarPermissao(tipoUsuarioID, telaID uint) (bool, error)
	VerificarPermissaoTipoUsuario(tipoUsuarioID uint, rota string) (bool, error)
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

	// Verificar se é admin da clínica (tipo_usuario com nome "Administrador")
	tipoUsuario, err := s.tipoUsuarioService.BuscarPorID(tipoUsuarioID)
	if err == nil && tipoUsuario.Nome == "Administrador" {
		return true, nil
	}

	// Buscar a tela pela rota
	tela, err := s.telaService.BuscarTelaPorRota(rota)
	if err != nil {
		// Se não encontrar a tela, negar acesso
		return false, nil
	}

	// Verificar se o tipo de usuário tem permissão para esta tela
	return s.repo.VerificarPermissao(tipoUsuarioID, tela.ID)
}
