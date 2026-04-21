package repositories

import (
	"errors"

	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

type UsuarioClinicaRepository interface {
	ListarPorUsuario(usuarioID uint) ([]models.UsuarioClinica, error)
	ObterAtivoPorUsuarioEClinica(usuarioID, clinicaID uint) (*models.UsuarioClinica, error)
	Criar(uc *models.UsuarioClinica) error
	AtualizarTipo(usuarioID, clinicaID, tipoUsuarioID uint) error
	UsuarioTemAssociacaoAtiva(usuarioID, clinicaID uint) (bool, error)
	// GarantirVinculoAtivo cria ou reativa vínculo usuário–clínica com o tipo informado.
	GarantirVinculoAtivo(usuarioID, clinicaID, tipoUsuarioID uint) error
}

type usuarioClinicaRepository struct {
	db *gorm.DB
}

func NovoUsuarioClinicaRepository(db *gorm.DB) UsuarioClinicaRepository {
	return &usuarioClinicaRepository{db: db}
}

func (r *usuarioClinicaRepository) ListarPorUsuario(usuarioID uint) ([]models.UsuarioClinica, error) {
	var out []models.UsuarioClinica
	err := r.db.Preload("Clinica").Preload("TipoUsuario").
		Where("usuario_id = ? AND ativo = ?", usuarioID, true).
		Order("clinica_id ASC").
		Find(&out).Error
	return out, err
}

func (r *usuarioClinicaRepository) ObterAtivoPorUsuarioEClinica(usuarioID, clinicaID uint) (*models.UsuarioClinica, error) {
	var uc models.UsuarioClinica
	err := r.db.Preload("TipoUsuario").Where("usuario_id = ? AND clinica_id = ? AND ativo = ?", usuarioID, clinicaID, true).First(&uc).Error
	if err != nil {
		return nil, err
	}
	return &uc, nil
}

func (r *usuarioClinicaRepository) Criar(uc *models.UsuarioClinica) error {
	return r.db.Create(uc).Error
}

func (r *usuarioClinicaRepository) AtualizarTipo(usuarioID, clinicaID, tipoUsuarioID uint) error {
	return r.db.Model(&models.UsuarioClinica{}).
		Where("usuario_id = ? AND clinica_id = ?", usuarioID, clinicaID).
		Update("tipo_usuario_id", tipoUsuarioID).Error
}

func (r *usuarioClinicaRepository) UsuarioTemAssociacaoAtiva(usuarioID, clinicaID uint) (bool, error) {
	var n int64
	err := r.db.Model(&models.UsuarioClinica{}).
		Where("usuario_id = ? AND clinica_id = ? AND ativo = ?", usuarioID, clinicaID, true).
		Count(&n).Error
	return n > 0, err
}

func (r *usuarioClinicaRepository) GarantirVinculoAtivo(usuarioID, clinicaID, tipoUsuarioID uint) error {
	var uc models.UsuarioClinica
	err := r.db.Where("usuario_id = ? AND clinica_id = ?", usuarioID, clinicaID).First(&uc).Error
	if err == nil {
		return r.db.Model(&uc).Updates(map[string]interface{}{
			"tipo_usuario_id": tipoUsuarioID,
			"ativo":           true,
		}).Error
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.Create(&models.UsuarioClinica{
			UsuarioID:     usuarioID,
			ClinicaID:     clinicaID,
			TipoUsuarioID: tipoUsuarioID,
			Ativo:         true,
		}).Error
	}
	return err
}
