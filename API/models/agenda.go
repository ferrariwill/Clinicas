package models

import (
	"time"

	"gorm.io/gorm"
)

type Agenda struct {
	gorm.Model
	PacienteID          uint              `json:"paciente_id"`
	Paciente            Paciente          `gorm:"foreignKey:PacienteID"`
	UsuarioID           uint              `json:"usuario_id"`
	Usuario             Usuario           `gorm:"foreignKey:UsuarioID"`
	ProcedimentoID      uint              `json:"procedimento_id"`
	Procedimento        Procedimento      `gorm:"foreignKey:ProcedimentoID"`
	ClinicaID           uint              `json:"clinica_id"`
	Clinica             Clinica           `gorm:"foreignKey:ClinicaID"`
	ConvenioID          *uint             `json:"convenio_id"`
	Convenio            *Convenio         `gorm:"foreignKey:ConvenioID"`
	DataHora            time.Time         `json:"data_hora"`
	StatusAgendamentoID uint              `json:"status_id"`
	StatusAgendamento   StatusAgendamento `gorm:"foreignKey:StatusAgendamentoID"`
	Observacoes         string            `json:"observacoes"`
}
