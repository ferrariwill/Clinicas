package servicedto

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/models/DTO"
)

func CriarTipoUsuarioDTO_CriarTipoUsuario(dto DTO.CriarTipoUsuarioDTO) models.TipoUsuario {
	return models.TipoUsuario{
		Nome:      dto.Nome,
		Descricao: dto.Descricao,
		Papel:     dto.Papel,
	}
}
