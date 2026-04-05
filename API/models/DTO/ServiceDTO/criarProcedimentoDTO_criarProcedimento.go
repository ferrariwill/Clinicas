package servicedto

import (
	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
)

func CriarProcedimentoDTO_CriarProcedimento(dto dto.CriarProcedimentoDTO, clinicaID uint) models.Procedimento {
	procedimento := models.Procedimento{
		Nome:      dto.Nome,
		Descricao: dto.Descricao,
		Valor:     dto.Valor,
		Duracao:   dto.DuracaoMin,
		ClinicaID: clinicaID,
		Ativo:     dto.Ativo,
	}
	return procedimento
}
