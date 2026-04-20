package servicedto

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/models/DTO"
)

func CriarClinicaDTO_CriarClinica(dto DTO.CriarClinicaDTO) models.Clinica {
	cnpj := ""
	if len(dto.Documento) == 14 {
		cnpj = dto.Documento
	}
	return models.Clinica{
		Nome:             dto.Nome,
		Documento:        dto.Documento,
		CNPJ:             cnpj,
		Ativa:            dto.Ativa,
		EmailResponsavel: dto.EmailResponsavel,
		NomeResponsavel:  dto.NomeResponsavel,
		Telefone:         dto.Telefone,
		Endereco:         dto.Endereco,
		Capacidade:       100}
}
