package DTO

// FechamentoFinanceiroRequest corpo de POST /clinicas/financeiro/fechamento.
type FechamentoFinanceiroRequest struct {
	DataInicio string `json:"dataInicio" binding:"required"`
	DataFim    string `json:"dataFim" binding:"required"`
}
