package models

import "gorm.io/gorm"

type Tela struct {
	gorm.Model
	Nome      string `json:"nome"`
	Rota      string `json:"rota"`
	Descricao string `json:"descricao"`

	Planos []Plano `gorm:"foreignKey:TelaID;constraint:OnDelete:CASCADE`
}
