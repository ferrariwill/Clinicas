package DTO

import "time"

type CriarAssinaturaDTO struct {
	PlanoID    uint       `json:"plano_id" binding:"required"`
	ClinicaID  uint       `json:"clinica_id" binding:"required"`
	DataInicio time.Time  `json:"data_inicio"`
	DataFim    *time.Time `json:"data_fim"`
}
