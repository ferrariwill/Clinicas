package DTO

type CriarAssinaturaDTO struct {
	PlanoID    uint `json:"plano_id" binding:"required"`
	ClinicaID  uint `json:"clinica_id" binding:"required"`
	// DataInicio no formato YYYY-MM-DD (input date do front; JSON padrão não preenche time.Time).
	DataInicio string  `json:"data_inicio" binding:"required"`
	// PeriodoAssinatura: ANUAL, SEMESTRAL ou DEFINIDO.
	PeriodoAssinatura string  `json:"periodo_assinatura"`
	// PeriodoMeses usado quando PeriodoAssinatura=DEFINIDO.
	PeriodoMeses *int `json:"periodo_meses"`
	DataFim    *string `json:"data_fim"`
}
