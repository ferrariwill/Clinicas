package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type PlanoRepository interface {
	Criar(plano models.Plano) (models.Plano, error)
	Atualizar(plano models.Plano) (models.Plano, error)
	Listar(ativo *bool) ([]*models.Plano, error)
	BuscarPorId(id int) (*models.Plano, error)
	Desativar(id int) error
	Reativar(id int) error
}

type planoRepository struct {
	db *gorm.DB
}

func NovoPlanoRepository(db *gorm.DB) PlanoRepository {
	return &planoRepository{db}
}

func (r *planoRepository) Criar(plano models.Plano) (models.Plano, error) {
	err := r.db.Create(&plano).Error
	return plano, err
}

func (r *planoRepository) Atualizar(plano models.Plano) (models.Plano, error) {
	err := r.db.Save(&plano).Error
	return plano, err
}

func (r *planoRepository) Listar(ativo *bool) ([]*models.Plano, error) {
	var planos []*models.Plano
	query := r.db.Model(models.Plano{})
	if ativo != nil {
		query = query.Where("ativo = ?", ativo)
	}
	err := query.Find(&planos).Error

	return planos, err
}

func (r *planoRepository) BuscarPorId(id int) (*models.Plano, error) {
	var plano models.Plano
	err := r.db.Where("id = ?", id).First(&plano).Error
	return &plano, err
}

func (r *planoRepository) Desativar(id int) error {
	return r.db.Model(&models.Plano{}).Where("id = ?", id).Update("ativo", false).Error
}

func (r *planoRepository) Reativar(id int) error {
	return r.db.Model(&models.Plano{}).Where("id = ?", id).Update("ativo", true).Error
}
