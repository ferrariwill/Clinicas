package DTO

type CriarTipoUsuarioDTO struct {
	Nome      string `json:"nome" binding:"required"`
	Descricao string `json:"descricao" binding:"required"`
}
