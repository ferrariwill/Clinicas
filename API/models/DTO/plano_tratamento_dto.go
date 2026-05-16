package DTO

// PlanoTratamentoRequest registra plano no prontuário, atualiza lembretes no cadastro do paciente e cria agendamento(s).
// Modo RETORNO: uma data/hora (data_hora) = retorno; sessoes_previstas ignorado.
// Modo SESSOES: data_hora = primeira sessão; sessoes_previstas obrigatório; intervalo_dias entre sessões (padrão 7).
type PlanoTratamentoRequest struct {
	Modo               string `json:"modo" binding:"required,oneof=RETORNO SESSOES"`
	PacienteID         uint   `json:"paciente_id" binding:"required"`
	UsuarioID          uint   `json:"usuario_id" binding:"required"`
	ProcedimentoID     uint   `json:"procedimento_id" binding:"required"`
	DataHora           string `json:"data_hora" binding:"required"`
	SessoesPrevistas   *int   `json:"sessoes_previstas"`
	IntervaloDias      int    `json:"intervalo_dias"`
	Observacoes        string `json:"observacoes"`
}
