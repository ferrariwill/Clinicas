package models

import "gorm.io/gorm"

type Procedimento struct {
	gorm.Model
	Nome      string  `json:"nome"`
	Descricao string  `json:"descricao"`
	Valor     float64 `json:"preco"`
	Duracao   int     `json:"duracao"`
	ClinicaID uint    `json:"clinica_id"`
	Ativo     bool    `json:"ativo"`

	Clinica Clinica `gorm:"foreignKey:ClinicaID" json:"clinica"`
}
