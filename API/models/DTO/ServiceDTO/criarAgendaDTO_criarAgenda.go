package servicedto

import (
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
)

func CriarAgendaDTO_CriarAgenda(d dto.CriarAgendaDTO, clinicaID uint, dataHora time.Time) models.Agenda {
	agenda := models.Agenda{
		PacienteID:          d.PacienteID,
		UsuarioID:           d.UsuarioID,
		ClinicaID:           clinicaID,
		ProcedimentoID:      d.ProcedimentoID,
		DataHora:            dataHora,
		Observacoes:         d.Observacoes,
		StatusAgendamentoID: d.StatusID,
	}
	return agenda
}
