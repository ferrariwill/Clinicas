package models

import "time"

type Usuario struct {
	ID            uint `gorm:"primaryKey"`
	Nome          string
	Email         string `gorm:"unique"`
	Senha         string
	ClinicaID     uint
	Clinica       Clinica `gorm:"foreignKey:ClinicaID"`
	TipoUsuarioID uint
	Ativo         bool
	TipoUsuario   TipoUsuario `gorm:"foreignKey:TipoUsuarioID"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
