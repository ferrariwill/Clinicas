package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/audit"
	"github.com/ferrariwill/Clinicas/API/middleware"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/API/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/ferrariwill/Clinicas/API/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos", "detalhes": err.Error()})
		return
	}

	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ids := agendaDTO.ProcedimentoIDs
	if len(ids) == 0 {
		if agendaDTO.ProcedimentoID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Informe procedimento_id ou procedimento_ids"})
			return
		}
		ids = []uint{agendaDTO.ProcedimentoID}
	}
	agendaDTO.ProcedimentoID = ids[0]
	extras := []uint{}
	if len(ids) > 1 {
		extras = ids[1:]
	}

	dataHora, err := utils.ParseAgendaDataHora(agendaDTO.DataHora)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	agendamento := servicedto.CriarAgendaDTO_CriarAgenda(agendaDTO, clinicaID, dataHora)
	agenda, err := ac.service.Criar(agendamento, extras)
	if err != nil {
		if errors.Is(err, repositories.ErrConflitoAgendamento) || errors.Is(err, repositories.ErrCapacidadeAgendaExcedida) {
			c.JSON(http.StatusConflict, gin.H{"erro": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	audit.Log(c.Request.Context(), audit.AcaoAgendamentoCriar, "agenda", agenda.ID)
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

	var dia *time.Time
	if ds := c.Query("data"); ds != "" {
		if parsed, e := time.ParseInLocation("2006-01-02", ds, utils.LocSaoPaulo()); e == nil {
			dia = &parsed
		}
	}
	var usuarioFiltro *uint
	if us := c.Query("usuario_id"); us != "" {
		if u, err := utils.StringParaUint(us); err == nil && u > 0 {
			usuarioFiltro = &u
		}
	}

	agendas, err := ac.service.Listar(clinicaID, dia, usuarioFiltro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"agendamentos": agendas})
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
		StatusID uint   `json:"status_id"`
		Status   string `json:"status"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	usuarioID, err := middleware.ExtrairDoToken[uint](c, "usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}

	stID := body.StatusID
	if stID == 0 && strings.TrimSpace(body.Status) != "" {
		nome := strings.TrimSpace(body.Status)
		if strings.EqualFold(nome, "FALTOU") || strings.EqualFold(nome, "FALTADO") {
			nome = "Falta"
		}
		var errSt error
		stID, errSt = ac.service.StatusIDPorNome(nome)
		if errSt != nil {
			c.JSON(http.StatusBadRequest, gin.H{"erro": "Status inválido"})
			return
		}
	}
	if stID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Informe status_id ou status"})
		return
	}

	if err := ac.service.AtualizarStatus(clinicaID, id, stID, usuarioID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"erro": "Agendamento não encontrado para esta clínica"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"mensagem": "Status atualizado com sucesso"})

}

// @Summary Horários Disponíveis
// @Description Buscar horários disponíveis para agendamento
// @Tags Agenda
// @Accept json
// @Produce json
// @Param usuario_id query int true "ID do usuário"
// @Param procedimento_id query int true "ID do procedimento"
// @Param data query string true "Data no formato YYYY-MM-DD"
// @Success 200 {object} map[string]interface{}
// @Router /clinicas/agenda/horarios-disponiveis [get]
// @Security BearerAuth
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
	data, err := time.ParseInLocation("2006-01-02", dataStr, utils.LocSaoPaulo())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida"})
		return
	}

	var duracaoTotal uint
	if ds := strings.TrimSpace(c.Query("duracao_total")); ds != "" {
		if v, e := strconv.ParseUint(ds, 10, 32); e == nil && v > 0 {
			duracaoTotal = uint(v)
		}
	}

	horarios, err := ac.service.HorariosDisponiveis(usuarioID, clinicaID, procedimentoID, data, duracaoTotal)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Sempre HH:mm no relógio de Brasília (evita Location=UTC no time.Time vindo do repositório).
	slots := make([]string, 0, len(horarios))
	br := utils.LocSaoPaulo()
	for _, t := range horarios {
		slots = append(slots, t.In(br).Format("15:04"))
	}
	c.JSON(http.StatusOK, slots)
}
