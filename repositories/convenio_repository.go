package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type ConvenioRepository interface {
	Criar(convenio models.Convenio) error
	Atualizar(convenio *models.Convenio) error
	Desativar(id uint, clinicaID uint) error
	Reativar(id uint, clinicaID uint) error
	BuscarPorID(id uint) (*models.Convenio, error)
	BuscarPorClinica(clinicaID uint, ativo *bool) ([]models.Convenio, error)

	//Convenio procedimentos
	CadastrarProcedimento(cp models.ConvenioProcedimento) error
	BuscarProcedimentosPorConvenio(convenioID uint) ([]models.ConvenioProcedimento, error)
	AtualizaProcedimentoPorConvenio(cp *models.ConvenioProcedimento) error
	DesativaProcedimentoPorConvenio(convenioID uint, procedimentoID uint) error
	ReativaProcedimentoPorConvenio(convenioID uint, procedimentoID uint) error
}

type convenioRepository struct {
	db *gorm.DB
}

func NovoConvenioRepository(db *gorm.DB) ConvenioRepository {
	return &convenioRepository{db: db}
}

func (r *convenioRepository) Criar(convenio models.Convenio) error {
	return r.db.Create(&convenio).Error
}

func (r *convenioRepository) BuscarPorClinica(clinicaID uint, ativo *bool) ([]models.Convenio, error) {
	var convenios []models.Convenio
	query := r.db.Where("clinica_id = ?", clinicaID)
	if ativo != nil {
		query = query.Where("ativo = ?", *ativo)
	}
	err := query.Find(&convenios).Error
	return convenios, err
}

func (r *convenioRepository) BuscarPorID(id uint) (*models.Convenio, error) {
	var convenio models.Convenio
	err := r.db.First(&convenio, id).Error
	return &convenio, err
}

func (r *convenioRepository) Atualizar(convenio *models.Convenio) error {
	return r.db.Save(convenio).Error
}

func (r *convenioRepository) Desativar(id uint, clinicaID uint) error {
	convenio, err := r.BuscarPorID(id)

	if err != nil {
		return err
	}

	if convenio.ClinicaID != clinicaID {
		return gorm.ErrRecordNotFound
	}

	convenio.Ativo = false
	return r.db.Save(convenio).Error
}

func (r *convenioRepository) Reativar(id uint, clinicaID uint) error {
	convenio, err := r.BuscarPorID(id)

	if err != nil {
		return err
	}

	if convenio.ClinicaID != clinicaID {
		return gorm.ErrRecordNotFound
	}

	convenio.Ativo = true
	return r.db.Save(convenio).Error
}

// Convenio Procedimento
func (r *convenioRepository) CadastrarProcedimento(cp models.ConvenioProcedimento) error {
	return r.db.Create(&cp).Error
}

func (r *convenioRepository) BuscarProcedimentosPorConvenio(convenioID uint) ([]models.ConvenioProcedimento, error) {
	var cps []models.ConvenioProcedimento
	err := r.db.Preload("Procedimento").Where("convenio_id = ?", convenioID).Find(&cps).Error
	return cps, err
}

func (r *convenioRepository) BuscarProcedimentoPorConvenio(convenioID uint, procedimentoID uint) (*models.ConvenioProcedimento, error) {
	var cp models.ConvenioProcedimento
	err := r.db.Where("convenio_id = ? AND procedimento_id = ?", convenioID, procedimentoID).First(&cp).Error

	if err != nil {
		return nil, err
	}

	return &cp, nil
}

func (r *convenioRepository) AtualizaProcedimentoPorConvenio(cp *models.ConvenioProcedimento) error {
	return r.db.Save(cp).Error
}

func (r *convenioRepository) DesativaProcedimentoPorConvenio(convenioID uint, procedimentoID uint) error {
	cp, err := r.BuscarProcedimentoPorConvenio(convenioID, procedimentoID)

	if err != nil {
		return err
	}

	cp.Ativo = false
	return r.db.Save(cp).Error
}

func (r *convenioRepository) ReativaProcedimentoPorConvenio(convenioID uint, procedimentoID uint) error {
	cp, err := r.BuscarProcedimentoPorConvenio(convenioID, procedimentoID)

	if err != nil {
		return err
	}

	cp.Ativo = true
	return r.db.Save(cp).Error
}
