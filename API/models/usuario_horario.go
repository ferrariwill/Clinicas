package models

import "gorm.io/gorm"

type UsuarioHorario struct {
	gorm.Model
	UsuarioID     uint    `json:"usuario_id"`
	Usuario       Usuario `gorm:"foreignKey:UsuarioID"`
	DiaSemana     int     `json:"dia_semana"` // 0=Domingo, 1=Segunda, 2=Terça, etc.
	HorarioInicio string  `json:"horario_inicio" example:"08:00"`
	HorarioFim    string  `json:"horario_fim" example:"18:00"`
	Ativo         bool    `json:"ativo" example:"true"`
}