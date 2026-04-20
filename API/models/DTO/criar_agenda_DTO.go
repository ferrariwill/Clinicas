package DTO

type CriarAgendaDTO struct {
	PacienteID      uint   `json:"paciente_id" binding:"required"`
	UsuarioID       uint   `json:"usuario_id" binding:"required"` // profissional responsável
	ProcedimentoID  uint   `json:"procedimento_id"`               // obrigatório se procedimento_ids vazio
	ProcedimentoIDs []uint `json:"procedimento_ids"`              // se informado, o primeiro vira procedimento principal e os demais são extras
	ConvenioID      *uint  `json:"convenio_id"`                   // opcional
	// ISO com ou sem fuso; sem fuso usa o fuso local do servidor (ParseAgendaDataHora).
	DataHora    string `json:"data_hora" binding:"required"`
	Observacoes string `json:"observacoes"`
	StatusID    uint   `json:"status_id"` // opcional: padrão "Agendado"
}
