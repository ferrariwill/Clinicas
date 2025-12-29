package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type TipoUsuarioController struct {
	service services.TipoUsuarioService
}

func NovoTipoUsuarioController(service services.TipoUsuarioService) *TipoUsuarioController {
	return &TipoUsuarioController{service}
}

// @Summary Criar tipo de usuário
// @Description Cria um novo tipo de usuário para uma clínica
// @Tags Admin - Tipos de Usuário
// @Accept json
// @Produce json
// @Param tipo_usuario body map[string]interface{} true "Dados do tipo de usuário"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario [post]
func (tc *TipoUsuarioController) Criar(c *gin.Context) {
	var dto DTO.CriarTipoUsuarioDTO

	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tu := servicedto.CriarTipoUsuarioDTO_CriarTipoUsuario(dto)

	if err := tc.service.Criar(&tu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, tu)
}

// @Summary Listar tipos de usuário
// @Description Lista todos os tipos de usuário de uma clínica
// @Tags Admin - Tipos de Usuário
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario [get]
func (tc *TipoUsuarioController) Listar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "clinica_id inválido"})
		return
	}

	tipos, err := tc.service.ListarPorClinica(uint(clinicaID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tipos)
}

// @Summary Buscar tipo de usuário
// @Description Busca um tipo de usuário por ID
// @Tags Admin - Tipos de Usuário
// @Produce json
// @Param id path uint true "ID do tipo de usuário"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario/{id} [get]
func (tc *TipoUsuarioController) Buscar(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	tu, err := tc.service.BuscarPorID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tipo de usuário não encontrado"})
		return
	}

	c.JSON(http.StatusOK, tu)
}

// @Summary Atualizar tipo de usuário
// @Description Atualiza um tipo de usuário
// @Tags Admin - Tipos de Usuário
// @Accept json
// @Produce json
// @Param id path uint true "ID do tipo de usuário"
// @Param tipo_usuario body map[string]interface{} true "Dados atualizados"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario/{id} [put]
func (tc *TipoUsuarioController) Atualizar(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var tu models.TipoUsuario
	if err := c.ShouldBindJSON(&tu); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tu.ID = uint(id)

	if err := tc.service.Atualizar(&tu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tu)
}

// @Summary Desativar tipo de usuário
// @Description Desativa um tipo de usuário
// @Tags Admin - Tipos de Usuário
// @Produce json
// @Param id path uint true "ID do tipo de usuário"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario/{id} [delete]
func (tc *TipoUsuarioController) Desativar(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := tc.service.Desativar(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tipo de usuário desativado"})
}

// @Summary Reativar tipo de usuário
// @Description Reativa um tipo de usuário
// @Tags Admin - Tipos de Usuário
// @Produce json
// @Param id path uint true "ID do tipo de usuário"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario/{id}/reativar [put]
func (tc *TipoUsuarioController) Reativar(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := tc.service.Reativar(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tipo de usuário reativado"})
}
