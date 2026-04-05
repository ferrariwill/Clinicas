package models

import "gorm.io/gorm"

type ConvenioProcedimento struct {
	gorm.Model
	ConvenioID     uint         `json:"convenio_id"`
	ProcedimentoID uint         `json:"procedimento_id"`
	Valor          float64      `json:"valor"`
	Ativo          bool         `json:"ativo"`
	Convenio       Convenio     `gorm:"foreignKey:ConvenioID;references:ID" json:"convenio"`
	Procedimento   Procedimento `gorm:"foreignKey:ProcedimentoID;references:ID" json:"procedimento"`
}
