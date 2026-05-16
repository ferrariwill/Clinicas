package controllers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/ferrariwill/Clinicas/API/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FechamentoFinanceiroController struct {
	svc services.FechamentoFinanceiroService
}

func NovoFechamentoFinanceiroController(svc services.FechamentoFinanceiroService) *FechamentoFinanceiroController {
	return &FechamentoFinanceiroController{svc: svc}
}

func (ctl *FechamentoFinanceiroController) exigeFinanceiro(c *gin.Context) (uint, bool) {
	papel, err := middleware.ExtrairDoToken[string](c, "papel")
	if err != nil || !rbac.PodeAcessarFinanceiro(papel) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Sem permissão para fechamento financeiro"})
		return 0, false
	}
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return 0, false
	}
	return clinicaID, true
}

// Preview GET /clinicas/financeiro/fechamento/preview?dataInicio=&dataFim=
func (ctl *FechamentoFinanceiroController) Preview(c *gin.Context) {
	clinicaID, ok := ctl.exigeFinanceiro(c)
	if !ok {
		return
	}
	diS := strings.TrimSpace(c.Query("dataInicio"))
	dfS := strings.TrimSpace(c.Query("dataFim"))
	if diS == "" || dfS == "" {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Informe dataInicio e dataFim (YYYY-MM-DD)"})
		return
	}
	di, err := time.ParseInLocation("2006-01-02", diS, time.Local)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "dataInicio inválida"})
		return
	}
	df, err := time.ParseInLocation("2006-01-02", dfS, time.Local)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "dataFim inválida"})
		return
	}
	out, err := ctl.svc.PreviewFechamento(clinicaID, di, df)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": utils.SafeErrorMessage(err, "Não foi possível calcular o preview")})
		return
	}
	c.JSON(http.StatusOK, out)
}

// Listar GET /clinicas/financeiro/fechamento
func (ctl *FechamentoFinanceiroController) Listar(c *gin.Context) {
	clinicaID, ok := ctl.exigeFinanceiro(c)
	if !ok {
		return
	}
	list, err := ctl.svc.ListarFechamentos(clinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": utils.SafeErrorMessage(err, "Erro ao listar fechamentos")})
		return
	}
	c.JSON(http.StatusOK, list)
}

// Buscar GET /clinicas/financeiro/fechamento/:id
func (ctl *FechamentoFinanceiroController) Buscar(c *gin.Context) {
	clinicaID, ok := ctl.exigeFinanceiro(c)
	if !ok {
		return
	}
	id, err := utils.StringParaUint(c.Param("id"))
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID inválido"})
		return
	}
	fp, err := ctl.svc.BuscarFechamento(clinicaID, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"erro": "Fechamento não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"erro": utils.SafeErrorMessage(err, "Erro ao buscar fechamento")})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":                fp.ID,
		"clinica_id":        fp.ClinicaID,
		"data_inicio":       fp.DataInicio.Format("2006-01-02"),
		"data_fim":          fp.DataFim.Format("2006-01-02"),
		"total_entradas":    fp.TotalEntradas,
		"total_saidas":      fp.TotalSaidas,
		"total_repasses":    fp.TotalRepasses,
		"lucro_liquido":     fp.LucroLiquido,
		"status":            fp.Status,
		"criado_em":         fp.CreatedAt.Format(time.RFC3339),
		"detalhamento_json": json.RawMessage(fp.DetalhamentoJSON),
	})
}

// Criar POST /clinicas/financeiro/fechamento
func (ctl *FechamentoFinanceiroController) Criar(c *gin.Context) {
	clinicaID, ok := ctl.exigeFinanceiro(c)
	if !ok {
		return
	}
	var body dto.FechamentoFinanceiroRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Informe dataInicio e dataFim (YYYY-MM-DD)"})
		return
	}
	di, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(body.DataInicio), time.Local)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "dataInicio inválida; use YYYY-MM-DD"})
		return
	}
	df, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(body.DataFim), time.Local)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "dataFim inválida; use YYYY-MM-DD"})
		return
	}

	fp, err := ctl.svc.CriarFechamento(clinicaID, di, df)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": utils.SafeErrorMessage(err, "Não foi possível concluir o fechamento")})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":               fp.ID,
		"clinica_id":       fp.ClinicaID,
		"data_inicio":      fp.DataInicio.Format("2006-01-02"),
		"data_fim":         fp.DataFim.Format("2006-01-02"),
		"total_entradas":   fp.TotalEntradas,
		"total_saidas":     fp.TotalSaidas,
		"total_repasses":   fp.TotalRepasses,
		"lucro_liquido":    fp.LucroLiquido,
		"status":           fp.Status,
		"detalhamento_json": json.RawMessage(fp.DetalhamentoJSON),
	})
}
