package models

import (
	"gorm.io/gorm"
)

// AtestadoMedico documento de afastamento vinculado ao paciente e ao profissional emissor.
type AtestadoMedico struct {
	gorm.Model
	ClinicaID      uint   `json:"clinica_id"`
	PacienteID     uint   `json:"paciente_id"`
	ProfissionalID uint   `json:"profissional_id"`
	Tipo           string `json:"tipo" gorm:"size:8"` // HORAS | DIAS
	Quantidade     uint   `json:"quantidade"`
	CID10          string `json:"cid10" gorm:"size:24"`
	TextoGerado    string `json:"texto_gerado" gorm:"type:text"`

	Paciente     Paciente `json:"paciente,omitempty" gorm:"foreignKey:PacienteID"`
	Profissional Usuario  `json:"profissional,omitempty" gorm:"foreignKey:ProfissionalID"`
}
