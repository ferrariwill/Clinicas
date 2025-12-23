package servicedto

import (
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
)

func CriarPacienteDTO_CriarPaciente(dto dto.CriarPacienteDTO, clinicaID uint) models.Paciente {
	paciente := models.Paciente{
		Nome:           dto.Nome,
		CPF:            dto.CPF,
		DataNascimento: dto.DataNasc,
		Email:          dto.Email,
		Telefone:       dto.Telefone,
		ClinicaID:      clinicaID,
		ConvenioID:     dto.ConvenioID,
	}
	return paciente
}
