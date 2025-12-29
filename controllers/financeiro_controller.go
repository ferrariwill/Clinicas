package controllers

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type FinanceiroController struct {
	permissaoService services.PermissaoTelaService
}

func NovoFinanceiroController(permissaoService services.PermissaoTelaService) *FinanceiroController {
	return &FinanceiroController{permissaoService: permissaoService}
}

// @Summary Abrir Financeiro
// @Description Abrir módulo financeiro
// @Tags Financeiro
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /financeiro/abrir [get]
// @Security BearerAuth
func (fc FinanceiroController) Abrir(c *gin.Context) {
	// Exemplo de validação manual dentro do controller (opcional)
	// Normalmente o middleware já cuida disso, mas aqui é um exemplo
	tipoUsuarioID, err := middleware.ExtrairDoToken[uint](c, "tipo_usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tipo de usuário não encontrado"})
		return
	}

	// Verificar permissão específica se necessário
	temAcesso, err := fc.permissaoService.VerificarPermissaoTipoUsuario(tipoUsuarioID, "/financeiro/abrir")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao verificar permissão"})
		return
	}

	if !temAcesso {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso negado"})
		return
	}

	c.JSON(200, gin.H{
		"message":         "Abrir Financeiro",
		"tipo_usuario_id": tipoUsuarioID,
	})
}
