package models

import "gorm.io/gorm"

type TipoUsuario struct {
	gorm.Model
	Nome      string
	Descricao string
	ClinicaID uint
	Clinica   Clinica `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
}
