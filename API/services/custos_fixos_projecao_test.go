package services

import (
	"testing"
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
)

func TestValorCustoFixoNoPeriodo_parcialMes(t *testing.T) {
	loc := time.Local
	c := models.CustoFixo{ValorMensal: 100, Ativo: true, DiaPrevistoPagamento: 5}
	inicio := time.Date(2026, 5, 10, 0, 0, 0, 0, loc)
	fim := time.Date(2026, 5, 20, 0, 0, 0, 0, loc)
	if got := ValorCustoFixoNoPeriodo(c, inicio, fim); got != 0 {
		t.Fatalf("dia 5 fora do intervalo 10–20: esperado 0, obteve %v", got)
	}
	inicio2 := time.Date(2026, 5, 1, 0, 0, 0, 0, loc)
	fim2 := time.Date(2026, 5, 10, 0, 0, 0, 0, loc)
	if got := ValorCustoFixoNoPeriodo(c, inicio2, fim2); got != 100 {
		t.Fatalf("dia 5 dentro de 1–10: esperado 100, obteve %v", got)
	}
}

func TestValorCustoFixoNoPeriodo_dia31Fevereiro(t *testing.T) {
	loc := time.Local
	c := models.CustoFixo{ValorMensal: 50, Ativo: true, DiaPrevistoPagamento: 31}
	inicio := time.Date(2026, 2, 1, 0, 0, 0, 0, loc)
	fim := time.Date(2026, 2, 28, 0, 0, 0, 0, loc)
	if got := ValorCustoFixoNoPeriodo(c, inicio, fim); got != 50 {
		t.Fatalf("31 em fev/2026 vira 28: esperado 50, obteve %v", got)
	}
}

func TestSomarCustosFixosProjetadosNoPeriodo_doisMeses(t *testing.T) {
	loc := time.Local
	a := models.CustoFixo{ValorMensal: 10, Ativo: true, DiaPrevistoPagamento: 1}
	b := models.CustoFixo{ValorMensal: 20, Ativo: true, DiaPrevistoPagamento: 15}
	inicio := time.Date(2026, 4, 1, 0, 0, 0, 0, loc)
	fim := time.Date(2026, 5, 31, 0, 0, 0, 0, loc)
	got := SomarCustosFixosProjetadosNoPeriodo([]models.CustoFixo{a, b}, inicio, fim)
	// Abril + Maio: (10+20)*2 = 60
	if got != 60 {
		t.Fatalf("esperado 60, obteve %v", got)
	}
}
