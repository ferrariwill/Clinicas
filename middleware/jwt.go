package middleware

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func GerarToken(usuario *models.Usuario) (string, error) {
	claims := jwt.MapClaims{
		"usuario_id":      usuario.ID,
		"tipo_usuario_id": usuario.TipoUsuarioID,
		"clinica_id":      usuario.ClinicaID,
		"plano_id":        usuario.Clinica.Assinatura.PlanoID,
		"exp":             time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func ExtrairDoToken[T any](c *gin.Context, chave string) (T, error) {
	var vazio T

	// Pega o token do header
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		return vazio, fmt.Errorf("token não fornecido")
	}

	// Remove "Bearer " se existir
	if strings.HasPrefix(tokenString, "Bearer ") {
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")
	}

	// Faz o parse do token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !token.Valid {
		return vazio, fmt.Errorf("token inválido")
	}

	// Extrai os claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		if valor, existe := claims[chave]; existe {
			// Tentar converter para o tipo genérico
			convertido, ok := valor.(T)
			if ok {
				return convertido, nil
			}
			// Tratamento especial: números vêm como float64
			switch any(vazio).(type) {
			case int:
				if num, ok := valor.(float64); ok {
					return any(int(num)).(T), nil
				}
			case int64:
				if num, ok := valor.(float64); ok {
					return any(int64(num)).(T), nil
				}
			case string:
				if str, ok := valor.(string); ok {
					return any(str).(T), nil
				}
			}
			return vazio, fmt.Errorf("não foi possível converter o claim %s", chave)
		}
	}

	return vazio, fmt.Errorf("claim %s não encontrado", chave)
}
