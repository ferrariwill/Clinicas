package dto

type CriarTelaDTO struct {
	Nome      string `json:"nome" validate:"required"`
	Rota      string `json:"rota" validate:"required"`
	Descricao string `json:"descricao"`
}
