package models

import "gorm.io/gorm"

// CustoFixo representa despesa recorrente mensal (ex.: aluguel, internet).
type CustoFixo struct {
	gorm.Model
	ClinicaID    uint    `json:"clinica_id" gorm:"index;not null"`
	Descricao    string  `json:"descricao" gorm:"size:256;not null"`
	ValorMensal  float64 `json:"valor_mensal" gorm:"not null"`
	Ativo        bool    `json:"ativo" gorm:"default:true"`
}

func (CustoFixo) TableName() string {
	return "custos_fixos"
}
