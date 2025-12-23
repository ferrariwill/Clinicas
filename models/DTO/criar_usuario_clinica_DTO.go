package DTO

type CriarUsuarioClinicaDTO struct {
	Nome          string `json:"nome" binding:"required"`
	Email         string `json:"email" binding:"required,email"`
	Senha         string `json:"senha" binding:"required,min=6"`
	TipoUsuarioID uint   `json:"tipo_usuario_id" binding:"required"`
}
