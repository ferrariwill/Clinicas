package services

import (
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
)

// NormalizarDiaPrevistoPagamento devolve um dia entre 1 e 31 (padrão 1).
func NormalizarDiaPrevistoPagamento(d uint) int {
	if d < 1 || d > 31 {
		return 1
	}
	return int(d)
}

func ultimoDiaDoMes(y int, m time.Month, loc *time.Location) int {
	t := time.Date(y, m+1, 0, 0, 0, 0, 0, loc)
	return t.Day()
}

// DataPagamentoPrevistaNoMes retorna a data (00:00 local) do vencimento/pagamento previsto naquele mês-calendário.
// Se o dia não existir no mês (ex.: 31 em abril), usa o último dia do mês.
func DataPagamentoPrevistaNoMes(y int, m time.Month, diaPreferido int, loc *time.Location) time.Time {
	ult := ultimoDiaDoMes(y, m, loc)
	d := diaPreferido
	if d < 1 {
		d = 1
	}
	if d > ult {
		d = ult
	}
	return time.Date(y, m, d, 0, 0, 0, 0, loc)
}

// ValorCustoFixoNoPeriodo soma valor_mensal uma vez por mês em que a data prevista de pagamento cai em [inicio, fim] (inclusive).
func ValorCustoFixoNoPeriodo(c models.CustoFixo, inicio, fim time.Time) float64 {
	if !c.Ativo {
		return 0
	}
	loc := inicio.Location()
	dia := NormalizarDiaPrevistoPagamento(c.DiaPrevistoPagamento)
	var total float64
	cur := time.Date(inicio.Year(), inicio.Month(), 1, 0, 0, 0, 0, loc)
	fimMes := time.Date(fim.Year(), fim.Month(), 1, 0, 0, 0, 0, loc)
	for !cur.After(fimMes) {
		pay := DataPagamentoPrevistaNoMes(cur.Year(), cur.Month(), dia, loc)
		if !pay.Before(inicio) && !pay.After(fim) {
			total += c.ValorMensal
		}
		cur = cur.AddDate(0, 1, 0)
	}
	return total
}

// SomarCustosFixosProjetadosNoPeriodo agrega a projeção de todos os custos fixos ativos (e inativos na lista são ignorados por ValorCustoFixoNoPeriodo).
func SomarCustosFixosProjetadosNoPeriodo(custos []models.CustoFixo, inicio, fim time.Time) float64 {
	var s float64
	for i := range custos {
		s += ValorCustoFixoNoPeriodo(custos[i], inicio, fim)
	}
	return s
}
