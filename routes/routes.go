package routes

import (
	"github.com/ferrariwill/Clinicas/controllers"
	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/repositories"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	usurioRepo := repositories.NovoUsuarioRepository(db)
	tokenRepo := repositories.NovoTokenRepository(db)
	authService := services.NovoAuthService(usurioRepo, tokenRepo)

	r.POST("/login", controllers.LoginHandler(authService))
	r.PUT("/auth/alterar-senha", middleware.Autenticado(), controllers.AlterarSenhaHandler(authService))
	r.POST("/auth/esqueci-senha", controllers.EsqueciSenhaHandler(authService))
	r.POST("/auth/redefinir-senha", controllers.RedefinirSenhaHandler(authService))

}
