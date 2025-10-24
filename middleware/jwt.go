package middleware

import (
	"os"
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
