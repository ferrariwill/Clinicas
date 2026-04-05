package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type VerificaPermissaoTipoUsuarioMiddleware struct {
	PermissaoTelaService PermissaoTelaChecker
}

func NovaVerificacaoTipoUsuarioMiddleware(service PermissaoTelaChecker) VerificaPermissaoTipoUsuarioMiddleware {
	return VerificaPermissaoTipoUsuarioMiddleware{
		PermissaoTelaService: service,
	}
}

func (m *VerificaPermissaoTipoUsuarioMiddleware) VerificaPermissaoTipoUsuario(c *gin.Context) {
	rota := c.FullPath()

	// Extrair tipo_usuario_id do token
	tipoUsuarioID, err := ExtrairDoToken[uint](c, "tipo_usuario_id")
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"mensagem": "Tipo de usuário não encontrado",
		})
		c.Abort()
		return
	}

	// Verificar permissão
	temAcesso, err := m.PermissaoTelaService.VerificarPermissaoTipoUsuario(tipoUsuarioID, rota)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"mensagem": "Erro ao verificar permissão",
		})
		c.Abort()
		return
	}

	if !temAcesso {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"mensagem": "Acesso negado para esta funcionalidade",
		})
		c.Abort()
		return
	}

	c.Next()
}
