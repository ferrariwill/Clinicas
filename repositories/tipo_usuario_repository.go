package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type TipoUsuarioRepository interface {
	CriarTipoUsuario(tu *models.TipoUsuario) error
	BuscarPorNomeENomeClinica(nome string, clinicaID uint) (*models.TipoUsuario, error)
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
