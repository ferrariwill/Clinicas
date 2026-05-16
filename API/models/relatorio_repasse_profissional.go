package models

// RelatorioRepasseProfissionalLinha agrega repasse por profissional (agenda) no período.
type RelatorioRepasseProfissionalLinha struct {
	UsuarioID              uint    `json:"usuario_id"`
	Nome                   string  `json:"nome"`
	Especialidade          string  `json:"especialidade,omitempty"`
	PorcentagemRepasse     float64 `json:"porcentagem_repasse"`
	QuantidadeAtendimentos int     `json:"quantidade_atendimentos"`
	ValorBaseTotal         float64 `json:"valor_base_total"`
	ValorRepasseTotal      float64 `json:"valor_repasse_total"`
}

// RelatorioRepasseProfissionalDetalhe uma cobrança paga que entrou no relatório.
type RelatorioRepasseProfissionalDetalhe struct {
	CobrancaID             uint    `json:"cobranca_id"`
	AgendaID               uint    `json:"agenda_id"`
	UsuarioID              uint    `json:"usuario_id"`
	DataHora               string  `json:"data_hora"`
	PacienteNome           string  `json:"paciente_nome"`
	ValorBase              float64 `json:"valor_base"`
	PorcentagemRepasse     float64 `json:"porcentagem_repasse"`
	ValorRepasse           float64 `json:"valor_repasse"`
}
