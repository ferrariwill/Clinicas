package middleware

import (
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
)

// ExigePapéis restringe a rota aos papéis informados (JWT claim "papel").
func ExigePapeis(papeis ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		papel, err := ExtrairDoToken[string](c, "papel")
		if err != nil || papel == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"erro": "Papel de usuário não encontrado no token. Faça login novamente."})
			return
		}
		if !slices.Contains(papeis, papel) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"erro": "Você não tem permissão para esta operação"})
			return
		}
		c.Next()
	}
}
