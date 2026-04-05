package servicedto

import (
	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
)

func CriarAgendaDTO_CriarAgenda(dto dto.CriarAgendaDTO, clinicaID uint) models.Agenda {
	agenda := models.Agenda{
		PacienteID:          dto.PacienteID,
		UsuarioID:           dto.UsuarioID,
		ClinicaID:           clinicaID,
		ProcedimentoID:      dto.ProcedimentoID,
		DataHora:            dto.DataHora,
		Observacoes:         dto.Observacoes,
		StatusAgendamentoID: dto.StatusID,
	}
	return agenda
}
