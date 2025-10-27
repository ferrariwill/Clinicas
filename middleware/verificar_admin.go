package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func AutenticadoAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		tipoUsuarioInterface, existe := c.Get("tipo_usuario_id")
		if !existe {
			c.JSON(http.StatusUnauthorized, gin.H{"erro": "Token inválido"})
			c.Abort()
			return
		}

		tipoUsuarioID, ok := tipoUsuarioInterface.(uint)
		if !ok || tipoUsuarioID != 1 {
			c.JSON(http.StatusForbidden, gin.H{"erro": "Acesso restrito ao administrador do sistema"})
			c.Abort()
			return
		}

		c.Next()
	}
}
