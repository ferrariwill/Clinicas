package middleware

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type VerificaPermissaoTelaMiddleware struct {
	PlanoTelaService services.PlanoTelaService
}

func NovaVerificacaoTelaMiddleware(service services.PlanoTelaService) VerificaPermissaoTelaMiddleware {
	return VerificaPermissaoTelaMiddleware{
		PlanoTelaService: service,
	}
}

func (m *VerificaPermissaoTelaMiddleware) VerificaPermissaoTela(c *gin.Context) {
	rota := c.FullPath()
	planoIdInterface, existe := c.Get("plano_id")
	if !existe {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"mensagem": "Plano não encontrado",
		})
		c.Abort()
		return
	}

	planoID, ok := planoIdInterface.(uint)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"mensagem": "Plano não encontrado",
		})
		c.Abort()
		return
	}

	temAcesso, err := m.PlanoTelaService.PlanoTemAcesso(planoID, rota)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
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
