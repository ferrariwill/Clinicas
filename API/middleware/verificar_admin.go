package middleware

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/gin-gonic/gin"
)

// AutenticadoAdmin restringe ao papel ADM_GERAL (ou ao primeiro tipo cadastrado — legado id 1).
func AutenticadoAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		papel, err := ExtrairDoToken[string](c, "papel")
		if err == nil && papel == rbac.PapelADMGeral {
			c.Next()
			return
		}
		tipoUsuarioID, err := ExtrairDoToken[int](c, "tipo_usuario_id")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"erro": "Token inválido"})
			return
		}
		if tipoUsuarioID != 1 {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"erro": "Acesso restrito a administradores da plataforma"})
			return
		}
		c.Next()
	}
}
