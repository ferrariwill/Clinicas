package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type TipoUsuarioRepository interface {
	CriarTipoUsuario(tu *models.TipoUsuario) error
	BuscarPorNomeENomeClinica(nome string, clinicaID uint) (*models.TipoUsuario, error)
	ListarPorClinica(clinicaID uint) ([]models.TipoUsuario, error)
	BuscarPorID(id uint) (*models.TipoUsuario, error)
	Atualizar(tu *models.TipoUsuario) error
	Desativar(id uint) error
	Reativar(id uint) error
}

type tipoUsuarioRepository struct {
	db *gorm.DB
}

func NovoTipoUsuarioRepository(db *gorm.DB) TipoUsuarioRepository {
	return &tipoUsuarioRepository{db}
}

func (r *tipoUsuarioRepository) CriarTipoUsuario(tu *models.TipoUsuario) error {
	return r.db.Create(tu).Error
}

func (r *tipoUsuarioRepository) BuscarPorNomeENomeClinica(nome string, clinicaID uint) (*models.TipoUsuario, error) {
	var tu models.TipoUsuario
	err := r.db.Where("nome = ? AND clinica_id = ?", nome, clinicaID).First(&tu).Error
	return &tu, err
}

func (r *tipoUsuarioRepository) ListarPorClinica(clinicaID uint) ([]models.TipoUsuario, error) {
	var tipos []models.TipoUsuario
	err := r.db.Where("clinica_id = ?", clinicaID).Find(&tipos).Error
	return tipos, err
}

func (r *tipoUsuarioRepository) BuscarPorID(id uint) (*models.TipoUsuario, error) {
	var tu models.TipoUsuario
	err := r.db.First(&tu, id).Error
	return &tu, err
}

func (r *tipoUsuarioRepository) Atualizar(tu *models.TipoUsuario) error {
	return r.db.Save(tu).Error
}

func (r *tipoUsuarioRepository) Desativar(id uint) error {
	return r.db.Model(&models.TipoUsuario{}).Where("id = ?", id).Update("deleted_at", "NOW()").Error // soft delete
}

func (r *tipoUsuarioRepository) Reativar(id uint) error {
	return r.db.Model(&models.TipoUsuario{}).Where("id = ?", id).Update("deleted_at", nil).Error
}
