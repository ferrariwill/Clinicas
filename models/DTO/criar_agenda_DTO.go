package dto

import "time"

type CriarAgendaDTO struct {
	PacienteID     uint      `json:"paciente_id" binding:"required"`
	UsuarioID      uint      `json:"usuario_id" binding:"required"` // profissional responsável
	ProcedimentoID uint      `json:"procedimento_id" binding:"required"`
	ConvenioID     *uint     `json:"convenio_id"` // opcional
	DataHora       time.Time `json:"data_hora" binding:"required"`
	Observacoes    string    `json:"observacoes"`
	StatusID       uint      `json:"status_id" binding:"required"`
}
