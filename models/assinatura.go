package models

import "gorm.io/gorm"

type Assinatura struct {
	gorm.Model
	ClinicaID     uint     `json:"clinica_id"`
	Clinica       *Clinica `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
	PlanoID       uint     `json:"plano_id"`
	Plano         Plano    `gorm:"foreignKey:PlanoID;constraint:OnDelete:CASCADE"`
	DataInicio    string   `json:"data_inicio"`
	DataExpiracao string   `json:"data_expiracao"`
	Status        string   `json:"status"`
}
