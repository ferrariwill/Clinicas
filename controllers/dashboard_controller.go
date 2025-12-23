package controllers

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/services"
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