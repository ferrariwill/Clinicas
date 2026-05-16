package DTO

import "encoding/json"

// FechamentoPreviewResponse pré-visualização do fechamento (sem gravar).
type FechamentoPreviewResponse struct {
	DataInicio             string          `json:"data_inicio"`
	DataFim                string          `json:"data_fim"`
	QuantidadeLancamentos  int             `json:"quantidade_lancamentos"`
	QuantidadeItensRepasse int             `json:"quantidade_itens_repasse"`
	TotalEntradas          float64         `json:"total_entradas"`
	TotalSaidas            float64         `json:"total_saidas"`
	TotalRepasses          float64         `json:"total_repasses"`
	LucroLiquido           float64         `json:"lucro_liquido"`
	Detalhamento           json.RawMessage `json:"detalhamento"`
}

// FechamentoListaItem resumo de um fechamento salvo (lista).
type FechamentoListaItem struct {
	ID             uint    `json:"id"`
	DataInicio     string  `json:"data_inicio"`
	DataFim        string  `json:"data_fim"`
	TotalEntradas  float64 `json:"total_entradas"`
	TotalSaidas    float64 `json:"total_saidas"`
	TotalRepasses  float64 `json:"total_repasses"`
	LucroLiquido   float64 `json:"lucro_liquido"`
	Status         string  `json:"status"`
	CriadoEm       string  `json:"criado_em"`
}
