package models

import "gorm.io/gorm"

type Plano struct {
	gorm.Model
	Nome           string  `json:"nome"`
	Descricao      string  `json:"descricao"`
	ValorMensal    float64 `json:"valor_mensal"`
	LimiteUsuarios int     `json:"limite_usuarios"`
}
