package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func AutenticadoAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		tipoUsuarioID, err := ExtrairDoToken[int](c, "tipo_usuario_id")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			return
		}
		if tipoUsuarioID != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Acesso negado"})
			return
		}
		c.Next()
	}
}
