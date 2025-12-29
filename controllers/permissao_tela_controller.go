package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type PermissaoTelaController struct {
	service services.PermissaoTelaService
}

func NovoPermissaoTelaController(service services.PermissaoTelaService) *PermissaoTelaController {
	return &PermissaoTelaController{service}
}

// @Summary Associar tela a tipo de usuário
// @Description Associa uma tela a um tipo de usuário (concede permissão)
// @Tags Admin - Permissões de Tela
// @Accept json
// @Produce json
// @Param permissao body map[string]uint true "tipo_usuario_id e tela_id"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/permissoes-tela [post]
func (pc *PermissaoTelaController) Associar(c *gin.Context) {
	var req struct {
		TipoUsuarioID uint `json:"tipo_usuario_id" binding:"required"`
		TelaID        uint `json:"tela_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := pc.service.AssociarTela(req.TipoUsuarioID, req.TelaID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Permissão concedida"})
}

// @Summary Desassociar tela de tipo de usuário
// @Description Remove a permissão de uma tela para um tipo de usuário
// @Tags Admin - Permissões de Tela
// @Produce json
// @Param tipo_usuario_id path uint true "ID do tipo de usuário"
// @Param tela_id path uint true "ID da tela"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/permissoes-tela/{tipo_usuario_id}/{tela_id} [delete]
func (pc *PermissaoTelaController) Desassociar(c *gin.Context) {
	tipoUsuarioIDStr := c.Param("tipo_usuario_id")
	telaIDStr := c.Param("tela_id")

	tipoUsuarioID, err := strconv.ParseUint(tipoUsuarioIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tipo_usuario_id inválido"})
		return
	}

	telaID, err := strconv.ParseUint(telaIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tela_id inválido"})
		return
	}

	if err := pc.service.DesassociarTela(uint(tipoUsuarioID), uint(telaID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Permissão removida"})
}

// @Summary Listar telas por tipo de usuário
// @Description Lista todas as telas que um tipo de usuário tem permissão
// @Tags Admin - Permissões de Tela
// @Produce json
// @Param tipo_usuario_id path uint true "ID do tipo de usuário"
// @Success 200 {array} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/permissoes-tela/tipo-usuario/{tipo_usuario_id} [get]
func (pc *PermissaoTelaController) ListarTelasPorTipoUsuario(c *gin.Context) {
	tipoUsuarioIDStr := c.Param("tipo_usuario_id")
	tipoUsuarioID, err := strconv.ParseUint(tipoUsuarioIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tipo_usuario_id inválido"})
		return
	}

	permissoes, err := pc.service.ListarTelasPorTipoUsuario(uint(tipoUsuarioID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, permissoes)
}

// @Summary Listar tipos de usuário por tela
// @Description Lista todos os tipos de usuário que têm permissão para uma tela
// @Tags Admin - Permissões de Tela
// @Produce json
// @Param tela_id path uint true "ID da tela"
// @Success 200 {array} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/permissoes-tela/tela/{tela_id} [get]
func (pc *PermissaoTelaController) ListarTiposUsuarioPorTela(c *gin.Context) {
	telaIDStr := c.Param("tela_id")
	telaID, err := strconv.ParseUint(telaIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tela_id inválido"})
		return
	}

	permissoes, err := pc.service.ListarTiposUsuarioPorTela(uint(telaID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, permissoes)
}

// @Summary Verificar permissão
// @Description Verifica se um tipo de usuário tem permissão para uma tela
// @Tags Admin - Permissões de Tela
// @Produce json
// @Param tipo_usuario_id path uint true "ID do tipo de usuário"
// @Param tela_id path uint true "ID da tela"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/permissoes-tela/verificar/{tipo_usuario_id}/{tela_id} [get]
func (pc *PermissaoTelaController) VerificarPermissao(c *gin.Context) {
	tipoUsuarioIDStr := c.Param("tipo_usuario_id")
	telaIDStr := c.Param("tela_id")

	tipoUsuarioID, err := strconv.ParseUint(tipoUsuarioIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tipo_usuario_id inválido"})
		return
	}

	telaID, err := strconv.ParseUint(telaIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tela_id inválido"})
		return
	}

	temPermissao, err := pc.service.VerificarPermissao(uint(tipoUsuarioID), uint(telaID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tem_permissao": temPermissao})
}
