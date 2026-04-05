package models

import "gorm.io/gorm"

type PlanoTela struct {
	gorm.Model
	PlanoID uint  `json:"plano_id"`
	Plano   Plano `gorm:"foreignKey:PlanoID;constraint:OnDelete:CASCADE"`

	TelaID uint `json:"tela_id"`
	Tela   Tela `gorm:"foreignKey:TelaID;constraint:OnDelete:CASCADE"`
}
