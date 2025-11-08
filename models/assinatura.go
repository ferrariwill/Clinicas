package models

import (
	"time"

	"gorm.io/gorm"
)

type Assinatura struct {
	gorm.Model
	ClinicaID     uint       `json:"clinica_id"`
	Clinica       *Clinica   `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
	PlanoID       uint       `json:"plano_id"`
	Plano         Plano      `gorm:"foreignKey:PlanoID;constraint:OnDelete:CASCADE"`
	DataInicio    time.Time  `json:"data_inicio"`
	DataExpiracao *time.Time `json:"data_expiracao"`
	Ativa         bool       `json:"ativa"`
}
