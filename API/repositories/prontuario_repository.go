package repositories

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

type ProntuarioRepository interface {
	// Criar persiste o registro sempre com clinica_id explícito (ignora valores divergentes no ponteiro).
	Criar(clinicaID uint, reg *models.ProntuarioRegistro) error
	ListarPorPaciente(clinicaID, pacienteID uint) ([]models.ProntuarioRegistro, error)
	BuscarPorIDClinica(id, clinicaID uint) (*models.ProntuarioRegistro, error)
	// AtualizarCampos altera apenas com WHERE id + clinica_id (nunca Save sem escopo de tenant).
	AtualizarCampos(clinicaID, id uint, titulo, conteudo string) error
	Deletar(id, clinicaID uint) error
}

type prontuarioRepository struct {
	db *gorm.DB
}

func NovoProntuarioRepository(db *gorm.DB) ProntuarioRepository {
	return &prontuarioRepository{db: db}
}

func (r *prontuarioRepository) Criar(clinicaID uint, reg *models.ProntuarioRegistro) error {
	reg.ClinicaID = clinicaID
	return r.db.Create(reg).Error
}

func (r *prontuarioRepository) ListarPorPaciente(clinicaID, pacienteID uint) ([]models.ProntuarioRegistro, error) {
	var list []models.ProntuarioRegistro
	err := r.db.Where("clinica_id = ? AND paciente_id = ?", clinicaID, pacienteID).
		Preload("Profissional", "clinica_id = ?", clinicaID).
		Order("created_at DESC").
		Find(&list).Error
	return list, err
}

func (r *prontuarioRepository) BuscarPorIDClinica(id, clinicaID uint) (*models.ProntuarioRegistro, error) {
	var reg models.ProntuarioRegistro
	err := r.db.Where("id = ? AND clinica_id = ?", id, clinicaID).First(&reg).Error
	if err != nil {
		return nil, err
	}
	return &reg, nil
}

func (r *prontuarioRepository) AtualizarCampos(clinicaID, id uint, titulo, conteudo string) error {
	res := r.db.Model(&models.ProntuarioRegistro{}).
		Where("id = ? AND clinica_id = ?", id, clinicaID).
		Updates(map[string]interface{}{
			"titulo":   titulo,
			"conteudo": conteudo,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *prontuarioRepository) Deletar(id, clinicaID uint) error {
	res := r.db.Where("id = ? AND clinica_id = ?", id, clinicaID).Delete(&models.ProntuarioRegistro{})
	return res.Error
}
