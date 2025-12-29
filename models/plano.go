package models

import "gorm.io/gorm"

type Plano struct {
	gorm.Model
	Nome           string       `json:"nome"`
	Descricao      string       `json:"descricao"`
	ValorMensal    float64      `json:"valor_mensal"`
	LimiteUsuarios int          `json:"limite_usuarios"`
	Ativo          bool         `json:"ativo"`
	Assinaturas    []Assinatura `json:"assinaturas" gorm:"foreignKey:PlanoID;constraint:OnDelete:CASCADE"`
	Telas          []Tela       `json:"telas" gorm:"many2many:plano_telas;"`
}
