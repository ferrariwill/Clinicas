package repositories

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

type FechamentoPeriodoRepository interface {
	Criar(tx *gorm.DB, f *models.FechamentoPeriodo) error
	ListarPorClinica(clinicaID uint) ([]models.FechamentoPeriodo, error)
	BuscarPorIDClinica(id, clinicaID uint) (*models.FechamentoPeriodo, error)
}

type fechamentoPeriodoRepository struct {
	db *gorm.DB
}

func NovoFechamentoPeriodoRepository(db *gorm.DB) FechamentoPeriodoRepository {
	return &fechamentoPeriodoRepository{db: db}
}

func (r *fechamentoPeriodoRepository) Criar(tx *gorm.DB, f *models.FechamentoPeriodo) error {
	db := tx
	if db == nil {
		db = r.db
	}
	return db.Create(f).Error
}

func (r *fechamentoPeriodoRepository) ListarPorClinica(clinicaID uint) ([]models.FechamentoPeriodo, error) {
	var rows []models.FechamentoPeriodo
	err := r.db.Where("clinica_id = ?", clinicaID).Order("data_fim DESC, id DESC").Find(&rows).Error
	return rows, err
}

func (r *fechamentoPeriodoRepository) BuscarPorIDClinica(id, clinicaID uint) (*models.FechamentoPeriodo, error) {
	var f models.FechamentoPeriodo
	err := r.db.Where("id = ? AND clinica_id = ?", id, clinicaID).First(&f).Error
	if err != nil {
		return nil, err
	}
	return &f, nil
}
