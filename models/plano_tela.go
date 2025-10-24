package models

import "gorm.io/gorm"

type PlanoTela struct {
	gorm.Model
	PlanoID uint  `json:"plano_id"`
	Plano   Plano `gorm:"foreignKey:PlanoID"`
	TelaID  uint  `json:"tela_id"`
	Tela    Tela  `gorm:"foreignKey:TelaID"`
}
