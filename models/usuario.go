package models

import "gorm.io/gorm"

type Usuario struct {
	gorm.Model
	Nome          string
	Email         string `gorm:"unique"`
	Senha         string
	Ativo         bool
	ClinicaID     uint
	Clinica       Clinica `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
	TipoUsuarioID uint
	TipoUsuario   TipoUsuario `gorm:"foreignKey:TipoUsuarioID;constraint:OnDelete:CASCADE"`
}
