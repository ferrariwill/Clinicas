package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type ClinicaController struct {
	service services.ClinicaService
}

func NovaClinicaController(s services.ClinicaService) *ClinicaController {
	return &ClinicaController{service: s}
}

func (cc *ClinicaController) Criar(c *gin.Context) {
	var clinica models.Clinica
	if err := c.ShouldBindJSON(&clinica); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}

	if err := cc.service.CadastrarClinica(&clinica); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"clinica": clinica})
}

func (cc *ClinicaController) Listar(c *gin.Context) {
	var filtro *bool
	if param := c.Query("ativas"); param != "" {
		val := param == "true"
		filtro = &val
	}

	clinicas, err := cc.service.ListarClinicas(filtro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"clinicas": clinicas})
}

func (cc *ClinicaController) Buscar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	clinica, err := cc.service.BuscarPorID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "Clínica não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"clinica": clinica})
}

func (cc *ClinicaController) Atualizar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var clinica models.Clinica
	if err := c.ShouldBindJSON(&clinica); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}
	clinica.ID = uint(id)

	usuarioClinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}

	tipoUsuarioID, err := middleware.ExtrairDoToken[uint](c, "tipo_usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}

	if err := cc.service.AtualizarClinica(&clinica, usuarioClinicaID, tipoUsuarioID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"clinica": clinica})
}

func (cc *ClinicaController) Desativar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := cc.service.DesativarClinica(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensagem": "Clínica desativada com sucesso"})
}

func (cc *ClinicaController) Reativar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := cc.service.ReativarClinica(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensagem": "Clínica reativada com sucesso"})
}
