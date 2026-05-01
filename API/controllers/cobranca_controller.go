package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type CobrancaController struct {
	svc services.CobrancaService
}

func NovoCobrancaController(svc services.CobrancaService) *CobrancaController {
	return &CobrancaController{svc: svc}
}

func (cc *CobrancaController) Fila(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	lista, err := cc.svc.ListarFila(clinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"fila": lista})
}

func (cc *CobrancaController) Criar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	uid, err := middleware.ExtrairDoToken[uint](c, "usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	var body struct {
		AgendaID      uint     `json:"agenda_id" binding:"required"`
		Metodo        string   `json:"metodo" binding:"required"`
		ValorRecebido *float64 `json:"valor_recebido"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}
	row, err := cc.svc.CriarCobranca(clinicaID, uid, body.AgendaID, body.Metodo, body.ValorRecebido)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"cobranca": row})
}

func (cc *CobrancaController) Detalhe(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID inválido"})
		return
	}
	row, err := cc.svc.BuscarCobranca(clinicaID, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "Cobrança não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"cobranca": row})
}

func (cc *CobrancaController) RelatorioFinanceiro(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	papel, _ := middleware.ExtrairDoToken[string](c, "papel")
	if papel != rbac.PapelDono && papel != rbac.PapelADMGeral {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Apenas o dono da clínica (ou ADM) pode ver este relatório"})
		return
	}
	var inicio, fim *time.Time
	if s := c.Query("inicio"); s != "" {
		if t, e := time.Parse("2006-01-02", s); e == nil {
			inicio = &t
		}
	}
	if s := c.Query("fim"); s != "" {
		if t, e := time.Parse("2006-01-02", s); e == nil {
			tt := t.Add(24*time.Hour - time.Nanosecond)
			fim = &tt
		}
	}
	// Por padrão só liquidações com cobrança no Asaas (payment id). incluir_sem_gateway=1 traz dinheiro/manual e Pix/cartão só na recepção.
	incluirSemGateway := c.Query("incluir_sem_gateway") == "1"
	rows, err := cc.svc.RelatorioFinanceiro(clinicaID, inicio, fim, incluirSemGateway)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"recebimentos": rows})
}
