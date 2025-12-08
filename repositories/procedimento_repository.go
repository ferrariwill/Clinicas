package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type ProcedimentoRepository interface {
	Criar(procedimento *models.Procedimento) error
	BuscarTodos(ativo *bool) ([]models.Procedimento, error)
	BuscarPorID(id uint) (*models.Procedimento, error)
	BuscarPorClinica(clinicaID uint, ativo *bool) ([]models.Procedimento, error)
	Atualizar(procedimento *models.Procedimento) error
	Desativar(id uint, clinicaID uint) error
	Reativar(id uint, clinicaID uint) error
}

type procedimentoRepository struct {
	db *gorm.DB
}

func NovoProcedimentoRepository(db *gorm.DB) *procedimentoRepository {
	return &procedimentoRepository{db}
}

func (r *procedimentoRepository) Criar(procedimento *models.Procedimento) error {
	return r.db.Create(procedimento).Error
}

func (r *procedimentoRepository) BuscarTodos(ativo *bool) ([]models.Procedimento, error) {
	var procedimentos []models.Procedimento
	if ativo != nil {
		r.db.Where("ativo = ?", ativo).Find(&procedimentos)
		return procedimentos, nil
	}
	err := r.db.Find(&procedimentos).Error
	return procedimentos, err
}

func (r *procedimentoRepository) BuscarPorID(id uint) (*models.Procedimento, error) {
	var procedimento models.Procedimento
	err := r.db.First(&procedimento, id).Error
	return &procedimento, err
}

func (r *procedimentoRepository) BuscarPorClinica(clinicaID uint, ativo *bool) ([]models.Procedimento, error) {
	var procedimentos []models.Procedimento
	if ativo != nil {
		r.db.Where("clinica_id = ? AND ativo = ?", clinicaID, ativo).Find(&procedimentos)
		return procedimentos, nil
	}
	err := r.db.Where("clinica_id = ?", clinicaID).Find(&procedimentos).Error
	return procedimentos, err

}

func (r *procedimentoRepository) Atualizar(procedimento *models.Procedimento) error {
	return r.db.Save(procedimento).Error
}

func (r *procedimentoRepository) Desativar(id uint, clinicaID uint) error {
	procedimento, err := r.BuscarPorID(id)
	if err != nil {
		return err
	}

	if procedimento.ClinicaID != clinicaID {
		return gorm.ErrRecordNotFound
	}

	procedimento.Ativo = false
	return r.db.Save(procedimento).Error
}

func (r *procedimentoRepository) Reativar(id uint, clinicaID uint) error {
	procedimento, err := r.BuscarPorID(id)
	if err != nil {
		return err
	}

	if procedimento.ClinicaID != clinicaID {
		return gorm.ErrRecordNotFound
	}

	procedimento.Ativo = true
	return r.db.Save(procedimento).Error
}
