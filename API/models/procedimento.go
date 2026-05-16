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
	// Vazio = disponível para qualquer especialidade; senão MEDICO | FISIOTERAPEUTA | DENTISTA (mesmos códigos do usuário).
	Especialidade string `json:"especialidade" gorm:"size:24;default:''"`

	Clinica Clinica `gorm:"foreignKey:ClinicaID" json:"clinica"`
}
