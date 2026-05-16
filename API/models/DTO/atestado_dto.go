package DTO

// CriarAtestadoDTO entrada para emissão de atestado.
type CriarAtestadoDTO struct {
	PacienteID uint   `json:"paciente_id" binding:"required"`
	Tipo       string `json:"tipo" binding:"required"`
	Quantidade uint   `json:"quantidade" binding:"required"`
	CID10      string `json:"cid10" binding:"required"`
	// Opcional: horário em que o paciente esteve em consulta (formato 24h HH:MM). Informe ambos ou nenhum.
	ConsultaHoraInicio string `json:"consulta_hora_inicio"`
	ConsultaHoraFim    string `json:"consulta_hora_fim"`
}
