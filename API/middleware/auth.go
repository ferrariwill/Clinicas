package middleware

import (
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/ferrariwill/Clinicas/API/internal/tenant"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func Autenticado() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token ausente ou inválido"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Erro ao obter informações do token"})
			return
		}

		for k, v := range claims {
			c.Set(k, v)
		}

		clinicaID, err := claimUint(claims, "clinica_id")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"erro": "Token inválido: clínica ausente"})
			return
		}
		usuarioID, err := claimUint(claims, "usuario_id")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"erro": "Token inválido: usuário ausente"})
			return
		}
		tipoID, _ := claimUint(claims, "tipo_usuario_id")
		papel, _ := claimString(claims, "papel")
		c.Request = c.Request.WithContext(tenant.WithInfo(c.Request.Context(), tenant.Info{
			ClinicaID:     clinicaID,
			UsuarioID:     usuarioID,
			TipoUsuarioID: tipoID,
			Papel:         papel,
		}))

		c.Next()
	}
}

func claimUint(claims jwt.MapClaims, key string) (uint, error) {
	v, ok := claims[key]
	if !ok {
		return 0, errors.New("claim ausente")
	}
	switch n := v.(type) {
	case float64:
		return uint(n), nil
	case int:
		return uint(n), nil
	default:
		return 0, errors.New("claim inválido")
	}
}

func claimString(claims jwt.MapClaims, key string) (string, bool) {
	v, ok := claims[key]
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}
