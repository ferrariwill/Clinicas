package controllers

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

func LoginHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req struct {
			Email string `json:"email"`
			Senha string `json:"senha"`
		}

		c.BindJSON(&req)

		usuario, err := authService.Login(req.Email, req.Senha)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		token, err := middleware.GerarToken(usuario.ID, usuario.TipoUsuarioID, usuario.ClinicaID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar o token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"usuario": gin.H{
				"id":              usuario.ID,
				"nome":            usuario.Nome,
				"email":           usuario.Email,
				"tipo_usuario_id": usuario.TipoUsuarioID,
				"clinica_id":      usuario.ClinicaID,
			},
		})

	}
}

func AlterarSenhaHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req struct {
			Senha     string `json:"senha"`
			NovaSenha string `json:"nova_senha"`
		}

		c.BindJSON(&req)
		usuarioId, _ := middleware.ExtrairDoToken[uint](c, "usuario_id")
		err := authService.AlterarSenha(usuarioId, req.Senha, req.NovaSenha)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Senha alterada com sucesso"})

	}
}

func EsqueciSenhaHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req struct {
			Email string `json:"email"`
		}

		c.BindJSON(&req)

		err := authService.GerarTokenRedifinicao(req.Email)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Email enviado com sucesso"})

	}
}

func RedefinirSenhaHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req struct {
			Token     string `json:"token"`
			NovaSenha string `json:"nova_senha"`
		}

		c.BindJSON(&req)

		err := authService.RedefinirSenha(req.Token, req.NovaSenha)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Senha redefinida com sucesso"})

	}
}
