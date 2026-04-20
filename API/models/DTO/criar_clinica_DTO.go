package DTO

type CriarClinicaDTO struct {
	Nome             string `json:"nome" binding:"required"`
	Documento        string `json:"documento" binding:"required"`
	Ativa            bool   `json:"ativa"`
	EmailResponsavel string `json:"email_responsavel" binding:"required"`
	NomeResponsavel  string `json:"nome_responsavel" binding:"required"`
	Telefone         string `json:"telefone"`
	Endereco         string `json:"endereco"`
	// PlanoID identifica o plano de assinatura vinculado à clínica na criação.
	PlanoID uint `json:"plano_id" binding:"required"`
	// DataInicio assinatura (YYYY-MM-DD). Se vazio, usa a data atual.
	DataInicio string `json:"data_inicio"`
	// PeriodoAssinatura: ANUAL, SEMESTRAL ou DEFINIDO.
	PeriodoAssinatura string `json:"periodo_assinatura"`
	// PeriodoMeses usado quando PeriodoAssinatura=DEFINIDO.
	PeriodoMeses *int `json:"periodo_meses"`
	// DataFim opcional quando quiser data final explícita.
	DataFim *string `json:"data_fim"`
}
