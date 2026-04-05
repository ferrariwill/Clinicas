package repositories

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

type AuditLogRepository interface {
	Registrar(log *models.AuditLog) error
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
