package middleware

import (
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func GerarToken(usuarioID uint, tipoUsuarioID uint, clinicaID uint) (string, error) {
	claims := jwt.MapClaims{
		"usuario_id":      usuarioID,
		"tipo_usuario_id": tipoUsuarioID,
		"clinica_id":      clinicaID,
		"exp":             time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func ExtrairDoToken[T any](c *gin.Context, chave string) (T, error) {
	valor, existe := c.Get(chave)
	if !existe {
		var vazio T
		return vazio, nil
	}

	convertido, ok := valor.(T)
	if !ok {
		var vazio T
		return vazio, nil
	}
	return convertido, nil
}
