package controllers

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/ferrariwill/Clinicas/utils"
	"github.com/gin-gonic/gin"
)

type PacienteController struct {
	service services.PacienteService
}

func NovoPacienteController(service services.PacienteService) *PacienteController {
	return &PacienteController{
		service: service,
	}
}

// @Summary Criar paciente
// @Description Cria um novo paciente na clínica
// @Tags Pacientes
// @Accept json
// @Produce json
// @Param paciente body PacienteRequest true "Dados do paciente"
// @Success 201 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /pacientes [post]
func (cc *PacienteController) Criar(c *gin.Context) {
	var dto dto.CriarPacienteDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if err := cc.service.CriarPaciente(&dto, clinicaID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Paciente criado com sucesso"})

}

// @Summary Buscar paciente por CPF
// @Description Busca um paciente específico pelo CPF
// @Tags Pacientes
// @Accept json
// @Produce json
// @Param cpf path string true "CPF do paciente"
// @Success 200 {object} PacienteResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /pacientes/{cpf} [get]
func (cc *PacienteController) Buscar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	cpf := c.Param("cpf")

	paciente, err := cc.service.BuscarPacientePorCPF(cpf, clinicaID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, paciente)
}

// @Summary Listar pacientes
// @Description Lista todos os pacientes da clínica
// @Tags Pacientes
// @Accept json
// @Produce json
// @Success 200 {array} PacienteResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /pacientes [get]
func (cc *PacienteController) Listar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	pacientes, err := cc.service.ListarPacientes(clinicaID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, pacientes)
}

func (cc *PacienteController) Atualizar(c *gin.Context) {
	var paciente models.Paciente
	if err := c.ShouldBindJSON(&paciente); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	if err := cc.service.AtualizarPaciente(&paciente); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paciente atualizado com sucesso"})
}

func (cc *PacienteController) Desativar(c *gin.Context) {
	id, err := utils.StringParaUint(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := cc.service.DesativaPaciente(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paciente deletado com sucesso"})
}

func (cc *PacienteController) Reativar(c *gin.Context) {
	id, err := utils.StringParaUint(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := cc.service.ReativaPaciente(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paciente reativado com sucesso"})
}
