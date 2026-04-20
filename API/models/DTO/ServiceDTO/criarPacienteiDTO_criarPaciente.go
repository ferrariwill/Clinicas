package servicedto

import (
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
)

func CriarPacienteDTO_CriarPaciente(dto dto.CriarPacienteDTO, clinicaID uint) models.Paciente {
	var dataConsent *time.Time
	if s := strings.TrimSpace(dto.DataConsentimento); s != "" {
		if t, err := time.ParseInLocation("2006-01-02", s, time.Local); err == nil {
			dataConsent = &t
		}
	}
	paciente := models.Paciente{
		Nome:           dto.Nome,
		CPF:            dto.CPF,
		DataNascimento: dto.DataNasc,
		Email:          dto.Email,
		Telefone:       dto.Telefone,
		ClinicaID:      clinicaID,
		ConvenioID:     dto.ConvenioID,
		DataConsentimento: dataConsent,
		PodeReceberNotificacoes: dto.PodeReceberNotificacoes,
	}
	return paciente
}
