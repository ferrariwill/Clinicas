package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type ClinicaRepository interface {
	CriarClinica(c *models.Clinica) error
	BuscarPorId(id uint) (*models.Clinica, error)
	ListarClinicas(soAtivas *bool) ([]*models.Clinica, error)
	AtualiazarClinica(c *models.Clinica) error
	DesativarClinica(id uint) error
	ReativarClinica(id uint) error
}

type clinicaRepository struct {
	db *gorm.DB
}

func NovaClinicaRepository(db *gorm.DB) ClinicaRepository {
	return &clinicaRepository{db}
}

func (r *clinicaRepository) CriarClinica(c *models.Clinica) error {
	return r.db.Create(c).Error
}

func (r *clinicaRepository) BuscarPorId(id uint) (*models.Clinica, error) {
	var clinica models.Clinica
	err := r.db.First(&clinica, id).Error
	return &clinica, err
}

func (r *clinicaRepository) ListarClinicas(soAtivas *bool) ([]*models.Clinica, error) {
	var clinicas []*models.Clinica
	query := r.db.Model(&models.Clinica{})
	if soAtivas != nil {
		query = query.Where("ativa = ?", *soAtivas)
	}
	err := query.Find(&clinicas).Error

	return clinicas, err
}

func (r *clinicaRepository) AtualiazarClinica(c *models.Clinica) error {
	return r.db.Save(c).Error
}

func (r *clinicaRepository) DesativarClinica(id uint) error {
	return r.db.Model(&models.Clinica{}).Where("id = ?", id).Update("ativa", false).Error
}

func (r *clinicaRepository) ReativarClinica(id uint) error {
	return r.db.Model(&models.Clinica{}).Where("id = ?", id).Update("ativa", true).Error
}
