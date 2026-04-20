package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type LancamentoFinanceiroController struct {
	svc           services.LancamentoFinanceiroService
	custoFixoRepo repositories.CustoFixoRepository
}

func NovoLancamentoFinanceiroController(
	svc services.LancamentoFinanceiroService,
	custoFixoRepo repositories.CustoFixoRepository,
) *LancamentoFinanceiroController {
	return &LancamentoFinanceiroController{svc: svc, custoFixoRepo: custoFixoRepo}
}

// mesesInclusivosNoIntervalo conta meses-calendário cobertos (início e fim inclusivos por data).
func mesesInclusivosNoIntervalo(inicio, fim time.Time) int {
	loc := inicio.Location()
	a := time.Date(inicio.Year(), inicio.Month(), inicio.Day(), 0, 0, 0, 0, loc)
	b := time.Date(fim.Year(), fim.Month(), fim.Day(), 0, 0, 0, 0, loc)
	if b.Before(a) {
		return 1
	}
	y1, m1, _ := a.Date()
	y2, m2, _ := b.Date()
	n := (y2-y1)*12 + int(m2-m1) + 1
	if n < 1 {
		return 1
	}
	return n
}

type criarLancamentoBody struct {
	Descricao string  `json:"descricao"`
	Valor     float64 `json:"valor"`
	Tipo      string  `json:"tipo"`
	Categoria string  `json:"categoria"`
	Data      string  `json:"data"`
}

func parseDatePtr(s string) (*time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	t, err := time.ParseInLocation("2006-01-02", s, time.Local)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func parseDateRequired(s string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02", strings.TrimSpace(s), time.Local)
}

func lancamentoToJSON(l models.LancamentoFinanceiro) gin.H {
	return gin.H{
		"id":         strconv.FormatUint(uint64(l.ID), 10),
		"data":       l.Data.Format("2006-01-02"),
		"descricao":  l.Descricao,
		"valor":      l.Valor,
		"tipo":       l.Tipo,
		"categoria":  l.Categoria,
		"usuario_id": strconv.FormatUint(uint64(l.UsuarioID), 10),
		"criado_em":  l.CreatedAt.Format(time.RFC3339),
		"agenda_id":  nil,
	}
}

// Resumo GET /clinicas/financeiro/resumo?data_inicio=&data_fim=
func (lc *LancamentoFinanceiroController) Resumo(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	agora := time.Now()
	inicio := time.Date(agora.Year(), agora.Month(), 1, 0, 0, 0, 0, agora.Location())
	fim := time.Date(agora.Year(), agora.Month(), agora.Day(), 0, 0, 0, 0, agora.Location())
	if s := c.Query("data_inicio"); s != "" {
		if t, e := parseDateRequired(s); e == nil {
			inicio = t
		}
	}
	if s := c.Query("data_fim"); s != "" {
		if t, e := parseDateRequired(s); e == nil {
			fim = t
		}
	}
	if fim.Before(inicio) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data_fim deve ser >= data_inicio"})
		return
	}
	ent, sai, saldo, err := lc.svc.Resumo(clinicaID, inicio, fim)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	fixoMensal := 0.0
	if lc.custoFixoRepo != nil {
		if s, e := lc.custoFixoRepo.SomaMensalAtivos(clinicaID); e == nil {
			fixoMensal = s
		}
	}
	meses := mesesInclusivosNoIntervalo(inicio, fim)
	fixoPeriodo := fixoMensal * float64(meses)
	saiTotal := sai + fixoPeriodo
	saldoTotal := ent - saiTotal
	c.JSON(http.StatusOK, gin.H{
		"totalEntradas":          ent,
		"totalSaidasLancamentos": sai,
		"custosFixosMensal":      fixoMensal,
		"mesesNoPeriodo":         meses,
		"custosFixosNoPeriodo":   fixoPeriodo,
		"totalSaidas":            saiTotal,
		"saldoLiquido":           saldoTotal,
		// compat: saldo só com lançamentos (sem custos fixos)
		"saldoLiquidoLancamentos": saldo,
	})
}

// Listar GET /clinicas/financeiro?dataInicio=&dataFim=&categoria=
func (lc *LancamentoFinanceiroController) Listar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	var inicio, fim *time.Time
	if s := c.Query("dataInicio"); s != "" {
		if t, e := parseDatePtr(s); e == nil {
			inicio = t
		}
	}
	if s := c.Query("dataFim"); s != "" {
		if t, e := parseDatePtr(s); e == nil {
			fim = t
		}
	}
	var cat *string
	if s := strings.TrimSpace(c.Query("categoria")); s != "" {
		cat = &s
	}
	rows, err := lc.svc.Listar(clinicaID, inicio, fim, cat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]gin.H, 0, len(rows))
	for _, l := range rows {
		out = append(out, lancamentoToJSON(l))
	}
	c.JSON(http.StatusOK, out)
}

// Criar POST /clinicas/financeiro
func (lc *LancamentoFinanceiroController) Criar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	usuarioID, err := middleware.ExtrairDoToken[uint](c, "usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	var body criarLancamentoBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	body.Descricao = strings.TrimSpace(body.Descricao)
	if body.Descricao == "" || body.Valor <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "descrição e valor válidos são obrigatórios"})
		return
	}
	if body.Tipo != "RECEITA" && body.Tipo != "DESPESA" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tipo deve ser RECEITA ou DESPESA"})
		return
	}
	if body.Categoria != "PARTICULAR" && body.Categoria != "CONVENIO" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "categoria deve ser PARTICULAR ou CONVENIO"})
		return
	}
	var dataPtr *time.Time
	if strings.TrimSpace(body.Data) != "" {
		t, err := parseDatePtr(body.Data)
		if err != nil || t == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "data inválida; use YYYY-MM-DD"})
			return
		}
		dataPtr = t
	}
	l, err := lc.svc.Criar(clinicaID, usuarioID, body.Descricao, body.Valor, body.Tipo, body.Categoria, dataPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, lancamentoToJSON(*l))
}
