package servicedto

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/models/DTO"
)

func CriarClinicaDTO_CriarClinica(dto DTO.CriarClinicaDTO) models.Clinica {
	return models.Clinica{
		Nome:             dto.Nome,
		CNPJ:             dto.CNPJ,
		Ativa:            dto.Ativa,
		EmailResponsavel: dto.EmailResponsavel,
		Capacidade:       100}
}
