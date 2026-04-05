package controllers

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/API/internal/audit"
	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type FinanceiroController struct {
	permissaoService services.PermissaoTelaService
	auditLog         repositories.AuditLogRepository
}

func NovoFinanceiroController(permissaoService services.PermissaoTelaService, auditLog repositories.AuditLogRepository) *FinanceiroController {
	return &FinanceiroController{permissaoService: permissaoService, auditLog: auditLog}
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
	papel, err := middleware.ExtrairDoToken[string](c, "papel")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": "Token inválido"})
		return
	}
	if !rbac.PodeAcessarFinanceiro(papel) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Acesso ao módulo financeiro não permitido para o seu papel"})
		return
	}

	tipoUsuarioID, err := middleware.ExtrairDoToken[uint](c, "tipo_usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": "Tipo de usuário não encontrado"})
		return
	}

	temAcesso, err := fc.permissaoService.VerificarPermissaoTipoUsuario(tipoUsuarioID, "/financeiro/abrir")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao verificar permissão"})
		return
	}

	if !temAcesso {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Acesso negado"})
		return
	}

	clinicaID, _ := middleware.ExtrairDoToken[uint](c, "clinica_id")
	usuarioID, _ := middleware.ExtrairDoToken[uint](c, "usuario_id")
	audit.Log(c.Request.Context(), audit.AcaoFinanceiroAcesso, "financeiro", clinicaID)
	_ = fc.auditLog.Registrar(&models.AuditLog{
		ClinicaID: clinicaID,
		UsuarioID: usuarioID,
		Acao:      audit.AcaoFinanceiroAcesso,
		Recurso:   "financeiro",
		IP:        c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{
		"mensagem":        "Módulo financeiro disponível",
		"tipo_usuario_id": tipoUsuarioID,
	})
}
