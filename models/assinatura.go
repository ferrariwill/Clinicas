package models

import "gorm.io/gorm"

type Assinatura struct {
	gorm.Model
	ClinicaID     uint    `json:"clinica_id"`
	Clinica       Clinica `gorm:"foreignKey:ClinicaID"`
	PlanoID       uint    `json:"plano_id"`
	Plano         Plano   `gorm:"foreignKey:PlanoID"`
	DataInicio    string  `json:"data_inicio"`
	DataExpiracao string  `json:"data_expiracao"`
	Status        string  `json:"status"`
}
