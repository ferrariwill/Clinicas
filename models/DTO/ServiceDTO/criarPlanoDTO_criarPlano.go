package servicedto

import (
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
)

func CriarPlanoDTO_CriarPlano(dto dto.CriarPlanoDTO) models.Plano {
	plano := models.Plano{
		Nome:           dto.Nome,
		Descricao:      dto.Descricao,
		ValorMensal:    dto.Valor,
		LimiteUsuarios: dto.LimiteUsuarios,
		Ativo:          true,
	}
	return plano
}
