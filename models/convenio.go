package models

import "gorm.io/gorm"

type Convenio struct {
	gorm.Model
	Nome      string  `json:"nome"`
	Ativo     bool    `json:"ativo"`
	ClinicaID uint    `json:"clinica_id"`
	Clinica   Clinica `json:"clinica" gorm:"foreignKey:ClinicaID"`
}
