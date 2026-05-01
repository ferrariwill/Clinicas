package models

import (
	"time"

	"gorm.io/gorm"
)

// ProntuarioRegistro representa um registro clínico (evolução) vinculado ao paciente.
// Após 24h da criação, o registro torna-se imutável (conformidade / integridade assistencial).
type ProntuarioRegistro struct {
	gorm.Model
	PacienteID       uint    `json:"paciente_id"`
	Paciente         Paciente `gorm:"foreignKey:PacienteID"`
	ClinicaID        uint    `json:"clinica_id"`
	Clinica          Clinica `gorm:"foreignKey:ClinicaID"`
	ProfissionalID   uint    `json:"profissional_id"`
	Profissional     Usuario `gorm:"foreignKey:ProfissionalID" json:"profissional,omitempty"`
	Titulo           string  `json:"titulo"`
	Conteudo         string  `gorm:"type:text" json:"conteudo"`
}

// EditavelAte retorna o instante até o qual alterações são permitidas.
func (p ProntuarioRegistro) EditavelAte() time.Time {
	return p.CreatedAt.Add(24 * time.Hour)
}
