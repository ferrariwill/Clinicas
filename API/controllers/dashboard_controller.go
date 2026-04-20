package controllers

import (
	"net/http"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type DashboardController struct {
	service services.DashboardService
}

func NovoDashboardController(service services.DashboardService) *DashboardController {
	return &DashboardController{service: service}
}

// @Summary Dashboard principal
// @Description Retorna métricas gerais da clínica
// @Tags Dashboard
// @Accept json
// @Produce json
// @Success 200 {object} DashboardResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /dashboard [get]
func (dc *DashboardController) Dashboard(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	dashboard, err := dc.service.ObterDashboard(clinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dashboard)
}

// @Summary Agendamentos de hoje
// @Description Retorna os agendamentos do dia atual
// @Tags Dashboard
// @Accept json
// @Produce json
// @Success 200 {array} AgendamentoHojeResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /dashboard/agendamentos-hoje [get]
func (dc *DashboardController) AgendamentosHoje(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	agendamentos, err := dc.service.ObterAgendamentosHoje(clinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, agendamentos)
}

// @Summary Estatísticas da clínica
// @Description Retorna estatísticas básicas da clínica
// @Tags Dashboard
// @Accept json
// @Produce json
// @Success 200 {object} EstatisticasResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /dashboard/estatisticas [get]
func (dc *DashboardController) Estatisticas(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	estatisticas, err := dc.service.ObterEstatisticas(clinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, estatisticas)
}

// @Summary Métricas operacionais (faturamento e no-show)
// @Description Faturamento pela soma do valor dos procedimentos agendados no período e taxa de absenteísmo (status Falta sobre agendamentos não cancelados).
// @Tags Dashboard
// @Produce json
// @Param inicio query string false "Data inicial (YYYY-MM-DD)" default(primeiro dia do mês)
// @Param fim query string false "Último dia inclusivo do período (YYYY-MM-DD)"
// @Success 200 {object} MetricasOperacionaisSwagger
// @Router /dashboard/metricas-operacionais [get]
// @Security BearerAuth
func (dc *DashboardController) MetricasOperacionais(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	agora := time.Now()
	inicioMes := time.Date(agora.Year(), agora.Month(), 1, 0, 0, 0, 0, agora.Location())
	fimExclusivo := inicioMes.AddDate(0, 1, 0)
	temInicio := false

	if s := c.Query("inicio"); s != "" {
		t, err := time.ParseInLocation("2006-01-02", s, agora.Location())
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": "Parâmetro inicio inválido; use YYYY-MM-DD"})
			return
		}
		inicioMes = t
		temInicio = true
	}
	if s := c.Query("fim"); s != "" {
		t, err := time.ParseInLocation("2006-01-02", s, agora.Location())
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": "Parâmetro fim inválido; use YYYY-MM-DD"})
			return
		}
		fimExclusivo = t.Add(24 * time.Hour)
	} else if temInicio {
		fimExclusivo = inicioMes.AddDate(0, 1, 0)
	}

	if !fimExclusivo.After(inicioMes) {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Intervalo de datas inválido"})
		return
	}

	m, err := dc.service.ObterMetricasOperacionais(clinicaID, inicioMes, fimExclusivo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	papel, _ := middleware.ExtrairDoToken[string](c, "papel")
	if papel == rbac.PapelMedico {
		m.Faturamento = 0
	}
	c.JSON(http.StatusOK, m)
}
