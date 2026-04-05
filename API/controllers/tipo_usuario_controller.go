package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/API/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type TipoUsuarioController struct {
	service services.TipoUsuarioService
}

func NovoTipoUsuarioController(service services.TipoUsuarioService) *TipoUsuarioController {
	return &TipoUsuarioController{service}
}

// @Summary Criar tipo de usu?rio
// @Description Cria um novo tipo de usu?rio para uma cl?nica
// @Tags Admin - Tipos de Usu?rio
// @Accept json
// @Produce json
// @Param tipo_usuario body map[string]interface{} true "Dados do tipo de usu?rio"
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

	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "cl?nica inv?lida no token"})
		return
	}

	tu := servicedto.CriarTipoUsuarioDTO_CriarTipoUsuario(dto)
	tu.ClinicaID = clinicaID

	if err := tc.service.Criar(&tu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, tu)
}

// @Summary Listar tipos de usu?rio
// @Description Lista todos os tipos de usu?rio de uma cl?nica
// @Tags Admin - Tipos de Usu?rio
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario [get]
func (tc *TipoUsuarioController) Listar(c *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "clinica_id inv?lido"})
		return
	}

	tipos, err := tc.service.ListarPorClinica(uint(clinicaID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tipos)
}

// @Summary Buscar tipo de usu?rio
// @Description Busca um tipo de usu?rio por ID
// @Tags Admin - Tipos de Usu?rio
// @Produce json
// @Param id path uint true "ID do tipo de usu?rio"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario/{id} [get]
func (tc *TipoUsuarioController) Buscar(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inv?lido"})
		return
	}

	tu, err := tc.service.BuscarPorID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tipo de usu?rio n?o encontrado"})
		return
	}

	c.JSON(http.StatusOK, tu)
}

// @Summary Atualizar tipo de usu?rio
// @Description Atualiza um tipo de usu?rio
// @Tags Admin - Tipos de Usu?rio
// @Accept json
// @Produce json
// @Param id path uint true "ID do tipo de usu?rio"
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inv?lido"})
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

// @Summary Desativar tipo de usu?rio
// @Description Desativa um tipo de usu?rio
// @Tags Admin - Tipos de Usu?rio
// @Produce json
// @Param id path uint true "ID do tipo de usu?rio"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario/{id} [delete]
func (tc *TipoUsuarioController) Desativar(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inv?lido"})
		return
	}

	if err := tc.service.Desativar(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tipo de usu?rio desativado"})
}

// @Summary Reativar tipo de usu?rio
// @Description Reativa um tipo de usu?rio
// @Tags Admin - Tipos de Usu?rio
// @Produce json
// @Param id path uint true "ID do tipo de usu?rio"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/tipos-usuario/{id}/reativar [put]
func (tc *TipoUsuarioController) Reativar(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inv?lido"})
		return
	}

	if err := tc.service.Reativar(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tipo de usu?rio reativado"})
}
