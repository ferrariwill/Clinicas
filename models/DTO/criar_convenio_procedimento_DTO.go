package DTO

type ConvenioProcedimentoDTO struct {
	ConvenioID     uint    `json:"convenio_id"`
	ProcedimentoID uint    `json:"procedimento_id"`
	Valor          float64 `json:"valor"`
	Ativo          bool    `json:"ativo"`
}
