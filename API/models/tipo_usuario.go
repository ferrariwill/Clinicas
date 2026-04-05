package models

import "gorm.io/gorm"

type TipoUsuario struct {
	gorm.Model
	Nome      string
	Descricao string
	// Papel identifica o RBAC por clínica: ADM_GERAL, DONO, MEDICO, SECRETARIA
	Papel     string `gorm:"size:32;index"`
	ClinicaID uint
	Clinica   Clinica `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
}
