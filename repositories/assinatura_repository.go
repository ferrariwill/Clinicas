package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type AssinaturaRepository interface {
	Criar(assinatura *models.Assinatura) error
	Atualizar(assinatura *models.Assinatura) error
	Listar(ativo *bool) ([]models.Assinatura, error)
	Consultar(clinicaID *uint, planoID *uint) (*[]models.Assinatura, error)
	Desativar(id int) error
	Reativar(id int) error
}

type assinaturaRepository struct {
	db *gorm.DB
}

func NovaAssinaturaRepository(db *gorm.DB) AssinaturaRepository {
	return &assinaturaRepository{db: db}
}

func (r *assinaturaRepository) Criar(assinatura *models.Assinatura) error {
	return r.db.Create(assinatura).Error
}

func (r *assinaturaRepository) Atualizar(assinatura *models.Assinatura) error {
	return r.db.Save(assinatura).Error
}

func (r *assinaturaRepository) Listar(ativo *bool) ([]models.Assinatura, error) {
	var assinaturas []models.Assinatura
	query := r.db.Model(models.Assinatura{})

	if ativo != nil {
		query = query.Where("ativo = ?", ativo)
	}

	err := query.Find(&assinaturas).Error
	return assinaturas, err
}

func (r *assinaturaRepository) Consultar(clinicaID *uint, planoID *uint) (*[]models.Assinatura, error) {
	var assinatura []models.Assinatura
	query := r.db.Model(models.Assinatura{})
	if clinicaID != nil {
		query = query.Where("clinica_id = ?", clinicaID)
	}
	if planoID != nil {
		query = query.Where("plano_id = ?", planoID)
	}
	err := query.Find(&assinatura).Error
	return &assinatura, err
}

func (r *assinaturaRepository) Desativar(id int) error {
	return r.db.Model(&models.Assinatura{}).Where("id = ?", id).Update("ativo", false).Error
}

func (r *assinaturaRepository) Reativar(id int) error {
	return r.db.Model(&models.Assinatura{}).Where("id = ?", id).Update("ativo", true).Error
}
