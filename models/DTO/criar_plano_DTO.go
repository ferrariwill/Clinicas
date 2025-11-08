package dto

type CriarPlanoDTO struct {
	Nome           string  `json:"nome" validate:"required"`
	Descricao      string  `json:"descricao"`
	Valor          float64 `json:"valor" validate:"required"`
	LimiteUsuarios int     `json:"limite_usuarios" validate:"required"`
	Ativo          bool    `json:"ativo" validate:"required"`
}
