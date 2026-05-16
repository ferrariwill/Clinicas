package repositories

import (
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

type AtestadoRepository interface {
	Criar(clinicaID uint, a *models.AtestadoMedico) error
	ListarPorPaciente(clinicaID, pacienteID uint) ([]models.AtestadoMedico, error)
	ListarPorProfissionalDesde(clinicaID, profissionalID uint, desde time.Time) ([]models.AtestadoMedico, error)
}

type atestadoRepository struct {
	db *gorm.DB
}

func NovoAtestadoRepository(db *gorm.DB) AtestadoRepository {
	return &atestadoRepository{db: db}
}

func (r *atestadoRepository) Criar(clinicaID uint, a *models.AtestadoMedico) error {
	a.ClinicaID = clinicaID
	return r.db.Create(a).Error
}

func (r *atestadoRepository) ListarPorPaciente(clinicaID, pacienteID uint) ([]models.AtestadoMedico, error) {
	var list []models.AtestadoMedico
	err := r.db.Where("clinica_id = ? AND paciente_id = ?", clinicaID, pacienteID).
		Preload("Profissional").
		Order("created_at DESC").
		Find(&list).Error
	return list, err
}

func (r *atestadoRepository) ListarPorProfissionalDesde(clinicaID, profissionalID uint, desde time.Time) ([]models.AtestadoMedico, error) {
	var list []models.AtestadoMedico
	err := r.db.Where("clinica_id = ? AND profissional_id = ? AND created_at >= ?", clinicaID, profissionalID, desde).
		Order("created_at ASC").
		Find(&list).Error
	return list, err
}
