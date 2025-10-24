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
	//Inicializacao de repositorios
	usurioRepo := repositories.NovoUsuarioRepository(db)
	clinicaRepo := repositories.NovaClinicaRepository(db)
	tokenRepo := repositories.NovoTokenRepository(db)

	//Inicializacao de services
	authService := services.NovoAuthService(usurioRepo, tokenRepo)
	usuarioService := services.NovoUsuarioService(usurioRepo)
	clinicaService := services.NovoClinicaService(clinicaRepo)

	//Inicializacao de controllers
	usuarioController := controllers.NovoUsuarioController(usuarioService)
	clinicaController := controllers.NovaClinicaController(clinicaService)

	//Endpoints referente a parte de autenticação

	r.POST("/login", controllers.LoginHandler(authService))
	r.PUT("/auth/alterar-senha", middleware.Autenticado(), controllers.AlterarSenhaHandler(authService))
	r.POST("/auth/esqueci-senha", controllers.EsqueciSenhaHandler(authService))
	r.POST("/auth/redefinir-senha", controllers.RedefinirSenhaHandler(authService))

	//Endpoints referente a parte de usuário
	usuarios := r.Group("/usuarios", middleware.Autenticado())
	{
		usuarios.POST("", usuarioController.Criar)
		usuarios.GET("", usuarioController.Listar)
		usuarios.GET("/:id", usuarioController.Buscar)
		usuarios.PUT("/:id", usuarioController.Atualizar)
		usuarios.DELETE("/:id", usuarioController.Deletar)
		usuarios.PUT("/:id/reativar", usuarioController.Ativar)
	}

	//endpoints referente a parte de clinica
	clinicas := r.Group("/clinicas", middleware.Autenticado())
	{
		clinicas.POST("", clinicaController.Criar)
		clinicas.GET("", clinicaController.Listar)
		clinicas.GET("/:id", clinicaController.Buscar)
		clinicas.PUT("/:id", clinicaController.Atualizar)
		clinicas.DELETE("/:id", clinicaController.Desativar)
		clinicas.PUT("/:id/reativar", clinicaController.Reativar)
	}

}
