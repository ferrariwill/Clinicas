package servicedto

import (
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
)

func CriarConvenioProcedimentoDTO_ConvenioProcedimento(dto dto.ConvenioProcedimentoDTO) models.ConvenioProcedimento {
	convenioProcedimento := models.ConvenioProcedimento{
		ConvenioID:     dto.ConvenioID,
		ProcedimentoID: dto.ProcedimentoID,
		Valor:          dto.Valor,
		Ativo:          dto.Ativo,
	}
	return convenioProcedimento
}
