package models

import "gorm.io/gorm"

// CustoFixo representa despesa recorrente mensal (ex.: aluguel, internet).
type CustoFixo struct {
	gorm.Model
	ClinicaID   uint    `json:"clinica_id" gorm:"index;not null"`
	Descricao   string  `json:"descricao" gorm:"size:256;not null"`
	ValorMensal float64 `json:"valor_mensal" gorm:"not null"`
	Ativo       bool    `json:"ativo" gorm:"default:true"`
	// Dia do mês em que o pagamento costuma ocorrer (1–31). Usado no resumo financeiro para contar o custo só nos meses em que a data prevista cai dentro do período filtrado (fechamentos parciais vs mês cheio).
	DiaPrevistoPagamento uint `json:"dia_previsto_pagamento" gorm:"not null;default:1"`
}

func (CustoFixo) TableName() string {
	return "custos_fixos"
}
