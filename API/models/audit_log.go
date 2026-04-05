package models

import "gorm.io/gorm"

// AuditLog armazena trilha de auditoria para conformidade (LGPD).
type AuditLog struct {
	gorm.Model
	ClinicaID uint   `gorm:"index"`
	UsuarioID uint   `gorm:"index"`
	Acao      string `gorm:"size:64;index"`
	Recurso   string `gorm:"size:64"`
	RecursoID *uint
	Detalhes  string `gorm:"type:text"`
	IP        string `gorm:"size:45"`
}
