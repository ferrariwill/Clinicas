package controllers

import (
	"net/http"
	"time"

	"github.com/ferrariwill/Clinicas/middleware"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/ferrariwill/Clinicas/utils"
	"github.com/gin-gonic/gin"
)

type AgendaController struct {
	service services.AgendaService
}

func NovaAgendaController(service services.AgendaService) *AgendaController {
	return &AgendaController{service: service}
}

// @Summary Criar agendamento
// @Description Cria um novo agendamento na clínica
// @Tags Agenda
// @Accept json
// @Produce json
// @Param agendamento body AgendaRequest true "Dados do agendamento"
// @Success 201 {object} AgendaResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /clinicas/agenda [post]
func (ac AgendaController) Criar(c *gin.Context) {
	var agendaDTO dto.CriarAgendaDTO
	if err := c.ShouldBindJSON(&agendaDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	agendamento := servicedto.CriarAgendaDTO_CriarAgenda(agendaDTO, clinicaID)
	agenda, err := ac.service.Criar(agendamento)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, agenda)
}

// @Summary Listar agendamentos
// @Description Lista todos os agendamentos da clínica
// @Tags Agenda
// @Accept json
// @Produce json
// @Success 200 {array} AgendaResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /clinicas/agenda [get]
func (ac AgendaController) Listar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	agendas, err := ac.service.Listar(clinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, agendas)
}

// @Summary Atualizar status do agendamento
// @Description Atualiza o status de um agendamento
// @Tags Agenda
// @Accept json
// @Produce json
// @Param id path int true "ID do agendamento"
// @Param status body AtualizarStatusRequest true "Novo status"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /clinicas/agenda/{id}/status [put]
func (ac AgendaController) AtualizarStatus(c *gin.Context) {
	id, err := utils.StringParaUint(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var body struct {
		StatusID uint `json:"status_id"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	if err := ac.service.AtualizarStatus(id, body.StatusID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status atualizado com sucesso"})

}

func (ac AgendaController) HorariosDisponiveis(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	usuarioID, err := utils.StringParaUint(c.Query("usuario_id"))
	if err != nil || usuarioID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário inválido"})
		return
	}

	procedimentoID, err := utils.StringParaUint(c.Query("procedimento_id"))
	if err != nil || procedimentoID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Procedimento inválido"})
		return
	}

	dataStr := c.Query("data") // formato YYYY-MM-DD
	data, err := time.Parse("2006-01-02", dataStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida"})
		return
	}

	horarios, err := ac.service.HorariosDisponiveis(usuarioID, clinicaID, procedimentoID, data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, horarios)
}
