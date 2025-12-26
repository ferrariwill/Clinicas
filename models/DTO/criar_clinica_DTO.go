package DTO

type CriarClinicaDTO struct {
	Nome             string `json:"nome" binding:"required"`
	CNPJ             string `json:"cnpj" binding:"required"`
	Ativa            bool   `json:"ativa"`
	EmailResponsavel string `json:"email_responsavel" binding:"required"`
}
