package repositories

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
	"time"
)

type AuditLogRepository interface {
	Registrar(log *models.AuditLog) error
	ListarFiltrado(usuarioID, pacienteID *uint) ([]models.AuditLog, error)
	AnonimizarAntigos(cutoff time.Time) (int64, error)
	DeletarAntigos(cutoff time.Time) (int64, error)
}

type auditLogRepository struct {
	db *gorm.DB
}

func NovoAuditLogRepository(db *gorm.DB) AuditLogRepository {
	return &auditLogRepository{db: db}
}

func (r *auditLogRepository) Registrar(log *models.AuditLog) error {
	return r.db.Create(log).Error
}

func (r *auditLogRepository) ListarFiltrado(usuarioID, pacienteID *uint) ([]models.AuditLog, error) {
	var out []models.AuditLog
	q := r.db.Model(&models.AuditLog{}).Order("created_at DESC")
	if usuarioID != nil && *usuarioID > 0 {
		q = q.Where("usuario_id = ?", *usuarioID)
	}
	if pacienteID != nil && *pacienteID > 0 {
		q = q.Where("paciente_id = ?", *pacienteID)
	}
	err := q.Limit(500).Find(&out).Error
	return out, err
}

// AnonimizarAntigos aplica minimização para logs anteriores ao cutoff.
func (r *auditLogRepository) AnonimizarAntigos(cutoff time.Time) (int64, error) {
	res := r.db.Model(&models.AuditLog{}).
		Where("created_at < ?", cutoff).
		Updates(map[string]interface{}{
			"usuario_id": 0,
			"paciente_id": nil,
			"clinica_id": 0,
			"ip":        "",
			"detalhes":  "LOG ANONIMIZADO POR POLÍTICA DE RETENÇÃO",
		})
	if res.Error != nil {
		return 0, res.Error
	}
	return res.RowsAffected, nil
}

// DeletarAntigos remove logs cujo updated_at esteja anterior ao cutoff (retenção).
func (r *auditLogRepository) DeletarAntigos(cutoff time.Time) (int64, error) {
	res := r.db.Where("updated_at < ?", cutoff).Delete(&models.AuditLog{})
	if res.Error != nil {
		return 0, res.Error
	}
	return res.RowsAffected, nil
}
