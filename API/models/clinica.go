package models

import "gorm.io/gorm"

type Clinica struct {
	gorm.Model
	Nome             string
	// Documento pode ser CPF (11) ou CNPJ (14). Campo CNPJ é mantido por compatibilidade legada.
	Documento        string
	CNPJ             string
	Ativa            bool
	EmailResponsavel string
	NomeResponsavel  string
	Telefone         string
	Endereco         string
	Capacidade       int
	Usuarios         []Usuario `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
}
