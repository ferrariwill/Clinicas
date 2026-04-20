package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type CustoFixoController struct {
	svc services.CustoFixoService
}

func NovoCustoFixoController(svc services.CustoFixoService) *CustoFixoController {
	return &CustoFixoController{svc: svc}
}

// Listar GET /clinicas/custos-fixos?ativos=true
func (cc *CustoFixoController) Listar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	var filtro *bool
	if q := strings.TrimSpace(c.Query("ativos")); q != "" {
		v := q == "true" || q == "1"
		filtro = &v
	}
	rows, err := cc.svc.Listar(clinicaID, filtro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, gin.H{
			"id":            strconv.FormatUint(uint64(row.ID), 10),
			"descricao":     row.Descricao,
			"valor_mensal":  row.ValorMensal,
			"ativo":         row.Ativo,
			"clinica_id":    strconv.FormatUint(uint64(row.ClinicaID), 10),
			"criado_em":     row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			"atualizado_em": row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	c.JSON(http.StatusOK, gin.H{"custos_fixos": out})
}

type criarCustoFixoBody struct {
	Descricao   string  `json:"descricao"`
	ValorMensal float64 `json:"valor_mensal"`
}

// Criar POST /clinicas/custos-fixos
func (cc *CustoFixoController) Criar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	var body criarCustoFixoBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	body.Descricao = strings.TrimSpace(body.Descricao)
	row, err := cc.svc.Criar(clinicaID, body.Descricao, body.ValorMensal)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"id":           strconv.FormatUint(uint64(row.ID), 10),
		"descricao":    row.Descricao,
		"valor_mensal": row.ValorMensal,
		"ativo":        row.Ativo,
	})
}

type atualizarCustoFixoBody struct {
	Descricao   string  `json:"descricao"`
	ValorMensal float64 `json:"valor_mensal"`
	Ativo       *bool   `json:"ativo"`
}

// Atualizar PUT /clinicas/custos-fixos/:id
func (cc *CustoFixoController) Atualizar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	id64, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id64 == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}
	var body atualizarCustoFixoBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	body.Descricao = strings.TrimSpace(body.Descricao)
	ativo := true
	if body.Ativo != nil {
		ativo = *body.Ativo
	}
	row, err := cc.svc.Atualizar(clinicaID, uint(id64), body.Descricao, body.ValorMensal, ativo)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":           strconv.FormatUint(uint64(row.ID), 10),
		"descricao":    row.Descricao,
		"valor_mensal": row.ValorMensal,
		"ativo":        row.Ativo,
	})
}
