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
	MaxPacientes       int  `json:"max_pacientes" gorm:"default:1"`
	// PermiteSimultaneo permite mais de um agendamento no mesmo horário (ex.: atendimentos em grupo).
	PermiteSimultaneo bool `json:"permite_simultaneo" gorm:"default:false"`
}
