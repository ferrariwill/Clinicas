package servicedto

import (
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
)

func CriarTelaDTO_CriarTela(dto dto.CriarTelaDTO) models.Tela {
	tela := models.Tela{
		Nome:      dto.Nome,
		Rota:      dto.Rota,
		Descricao: dto.Descricao,
		Ativo:     true,
	}

	return tela
}
