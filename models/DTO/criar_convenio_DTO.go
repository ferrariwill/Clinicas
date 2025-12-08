package dto

type CriarConvenioDTO struct {
	Nome  string `json:"nome" binding:"required"`
	Ativo bool   `json:"ativo" binding:"required"`
}
