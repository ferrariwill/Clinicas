package models

import "time"

type Clinica struct {
	ID               uint `gorm:"primary_key"`
	Nome             string
	CNPJ             string
	Endereco         string
	Plano            string
	EmailResponsavel string
	Capacidade       int
	Ativa            bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
}
