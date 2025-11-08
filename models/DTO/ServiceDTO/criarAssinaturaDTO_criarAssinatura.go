package servicedto

import (
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
)

func CriarAssinaturaDTO_CriarAssinatura(dto dto.CriarAssinaturaDTO) models.Assinatura {
	assinatura := models.Assinatura{
		PlanoID:       dto.PlanoID,
		ClinicaID:     dto.ClinicaID,
		DataInicio:    dto.DataInicio,
		DataExpiracao: dto.DataFim,
		Ativa:         true,
	}
	return assinatura
}
