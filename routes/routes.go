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

	validacaoAdm := middleware.AutenticadoAdmin()

	//Inicialização do middleware de permissao de acesso a telas
	planoTelaRepo := repositories.NovoPlanoTelaRepository(db)
	planoTelaSevice := services.NovoPlanoTelaService(planoTelaRepo)
	verificarPermissao := middleware.NovaVerificacaoTelaMiddleware(planoTelaSevice)

	//Inicializacao de repositorios
	usurioRepo := repositories.NovoUsuarioRepository(db)
	clinicaRepo := repositories.NovaClinicaRepository(db)
	tokenRepo := repositories.NovoTokenRepository(db)
	telaRepo := repositories.NovaTelaRepository(db)
	planoRepo := repositories.NovoPlanoRepository(db)

	//Inicializacao de services
	authService := services.NovoAuthService(usurioRepo, tokenRepo)
	usuarioService := services.NovoUsuarioService(usurioRepo)
	clinicaService := services.NovoClinicaService(clinicaRepo)
	telaService := services.NovaTelaService(telaRepo)
	planoService := services.NovoPlanoService(planoRepo)

	//Inicializacao de controllers
	usuarioController := controllers.NovoUsuarioController(usuarioService)
	clinicaController := controllers.NovaClinicaController(clinicaService)
	financeiroController := controllers.NovoFinanceiroController()
	adminController := controllers.NovoAdminController(planoService, telaService, planoTelaSevice)

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

	financeiro := r.Group("/financeiro", middleware.Autenticado(), verificarPermissao.VerificaPermissaoTela)
	{
		financeiro.GET("/abrir", financeiroController.Abrir)
	}

	admin := r.Group("/admin", middleware.Autenticado(), validacaoAdm)
	{
		admin.POST("/telas", adminController.CriarTela)
		admin.GET("/telas", adminController.ListarTelas)

		admin.GET("/planos/:id/telas", adminController.ListarTelasDoPlano)
		admin.GET("/planos/Listar", adminController.ListarPlanos)
		admin.POST("/planos/Criar", adminController.CriarPlano)
		admin.PUT("/planos/Associar", adminController.AssociarPlanoTela)

	}

}
