package models

import "gorm.io/gorm"

type Clinica struct {
	gorm.Model
	Nome             string
	CNPJ             string
	Ativa            bool
	EmailResponsavel string
	Capacidade       int
	Usuarios         []Usuario  `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
	Assinatura       *Assinatura `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"` 
}
