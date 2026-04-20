package servicedto

import (
	"fmt"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
)

func CriarAssinaturaDTO_CriarAssinatura(d dto.CriarAssinaturaDTO) (models.Assinatura, error) {
	di, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(d.DataInicio), time.Local)
	if err != nil {
		return models.Assinatura{}, fmt.Errorf("data_inicio inválida; use YYYY-MM-DD")
	}
	var exp *time.Time
	p := strings.ToUpper(strings.TrimSpace(d.PeriodoAssinatura))
	switch p {
	case "", "ANUAL":
		t := di.AddDate(1, 0, 0)
		exp = &t
	case "SEMESTRAL":
		t := di.AddDate(0, 6, 0)
		exp = &t
	case "DEFINIDO":
		if d.DataFim != nil && strings.TrimSpace(*d.DataFim) != "" {
			s := strings.TrimSpace(*d.DataFim)
			t, err := time.ParseInLocation("2006-01-02", s, time.Local)
			if err != nil {
				return models.Assinatura{}, fmt.Errorf("data_fim inválida; use YYYY-MM-DD")
			}
			if !t.After(di) {
				return models.Assinatura{}, fmt.Errorf("data_fim deve ser maior que data_inicio")
			}
			exp = &t
			break
		}
		meses := 0
		if d.PeriodoMeses != nil {
			meses = *d.PeriodoMeses
		}
		if meses <= 0 {
			return models.Assinatura{}, fmt.Errorf("periodo_meses deve ser maior que zero para período definido")
		}
		t := di.AddDate(0, meses, 0)
		exp = &t
	default:
		return models.Assinatura{}, fmt.Errorf("periodo_assinatura inválido. Use ANUAL, SEMESTRAL ou DEFINIDO")
	}
	return models.Assinatura{
		PlanoID:       d.PlanoID,
		ClinicaID:     d.ClinicaID,
		DataInicio:    di,
		DataExpiracao: exp,
		Ativa:         true,
	}, nil
}
