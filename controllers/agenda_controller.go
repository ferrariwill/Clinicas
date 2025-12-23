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

func (ac AgendaController) Criar(c *gin.Context) {
	var dto dto.CriarAgendaDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	agendamento := servicedto.CriarAgendaDTO_CriarAgenda(dto, clinicaID)
	agenda, err := ac.service.Criar(agendamento)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, agenda)
}

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
