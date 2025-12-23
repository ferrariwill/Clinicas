package models

import "gorm.io/gorm"

type Paciente struct {
	gorm.Model
	Nome           string `json:"nome"`
	CPF            string `json:"cpf"`
	DataNascimento string `json:"data_nascimento"`
	Telefone       string `json:"telefone"`
	Whatsapp       bool   `json:"whatsapp"`
	Email          string `json:"email"`
	Genero         string `json:"genero"`
	ClinicaID      uint   `json:"clinica_id"`
	Ativo          bool   `json:"ativo"`

	Clinica    Clinica   `gorm:"foreignKey:ClinicaID" json:"clinica"`
	ConvenioID *uint     `json:"convenio_id"`
	Convenio   *Convenio `gorm:"foreignKey:ConvenioID" json:"convenio"`
}
