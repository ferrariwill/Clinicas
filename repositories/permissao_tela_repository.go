package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type PermissaoTelaRepository interface {
	Criar(permissao *models.PermissaoTela) error
	ListarPorTipoUsuario(tipoUsuarioID uint) ([]models.PermissaoTela, error)
	ListarPorTela(telaID uint) ([]models.PermissaoTela, error)
	Remover(tipoUsuarioID, telaID uint) error
	VerificarPermissao(tipoUsuarioID, telaID uint) (bool, error)
}

type permissaoTelaRepository struct {
	db *gorm.DB
}

func NovoPermissaoTelaRepository(db *gorm.DB) PermissaoTelaRepository {
	return &permissaoTelaRepository{db}
}

func (r *permissaoTelaRepository) Criar(permissao *models.PermissaoTela) error {
	return r.db.Create(permissao).Error
}

func (r *permissaoTelaRepository) ListarPorTipoUsuario(tipoUsuarioID uint) ([]models.PermissaoTela, error) {
	var permissoes []models.PermissaoTela
	err := r.db.Preload("Tela").Where("tipo_usuario_id = ?", tipoUsuarioID).Find(&permissoes).Error
	return permissoes, err
}

func (r *permissaoTelaRepository) ListarPorTela(telaID uint) ([]models.PermissaoTela, error) {
	var permissoes []models.PermissaoTela
	err := r.db.Preload("TipoUsuario").Where("tela_id = ?", telaID).Find(&permissoes).Error
	return permissoes, err
}

func (r *permissaoTelaRepository) Remover(tipoUsuarioID, telaID uint) error {
	return r.db.Where("tipo_usuario_id = ? AND tela_id = ?", tipoUsuarioID, telaID).Delete(&models.PermissaoTela{}).Error
}

func (r *permissaoTelaRepository) VerificarPermissao(tipoUsuarioID, telaID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.PermissaoTela{}).Where("tipo_usuario_id = ? AND tela_id = ?", tipoUsuarioID, telaID).Count(&count).Error
	return count > 0, err
}
