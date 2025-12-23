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
	assinaturaRepo := repositories.NovaAssinaturaRepository(db)
	procedimentoRepo := repositories.NovoProcedimentoRepository(db)
	convenioRepo := repositories.NovoConvenioRepository(db)
	pacienteRepo := repositories.NovoPacienteRepository(db)
	agendaRepo := repositories.NovaAgendaRepository(db)

	//Inicializacao de services
	authService := services.NovoAuthService(usurioRepo, tokenRepo)
	usuarioService := services.NovoUsuarioService(usurioRepo)
	clinicaService := services.NovoClinicaService(clinicaRepo)
	telaService := services.NovaTelaService(telaRepo)
	planoService := services.NovoPlanoService(planoRepo)
	assinaturaService := services.NovaAssinaturaService(assinaturaRepo)
	procedimentoService := services.NovoProcedimentoService(procedimentoRepo, convenioRepo)
	convenioService := services.NovoConvenioService(convenioRepo, procedimentoRepo)
	pacienteService := services.NovoPacienteService(pacienteRepo)
	agendaService := services.NovaAgendaService(agendaRepo)

	//Inicializacao de controllers
	usuarioController := controllers.NovoUsuarioController(usuarioService)
	clinicaController := controllers.NovaClinicaController(clinicaService)
	procedimentoController := controllers.NovoProcedimentoController(procedimentoService)
	convenioController := controllers.NovoConvenioCoontroller(convenioService)
	pacienteController := controllers.NovoPacienteController(pacienteService)
	agendaController := controllers.NovaAgendaController(agendaService)
	financeiroController := controllers.NovoFinanceiroController()
	adminController := controllers.NovoAdminController(planoService,
		telaService,
		planoTelaSevice,
		assinaturaService)

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

	//Enspoints referente a parte de paciente
	pacientes := r.Group("/pacientes", middleware.Autenticado())
	{
		pacientes.POST("", pacienteController.Criar)
		pacientes.GET("", pacienteController.Listar)
		pacientes.GET("/:cpf", pacienteController.Buscar)
		pacientes.PUT("/:id", pacienteController.Atualizar)
		pacientes.DELETE("/:id", pacienteController.Desativar)
		pacientes.PUT("/:id/reativar", pacienteController.Reativar)
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

		//Usuarios
		clinicas.POST("/usuarios", usuarioController.CriarUsuarioClinica)

		//Agendamentos
		clinicas.POST("/agenda", agendaController.Criar)
		clinicas.GET("/agenda", agendaController.Listar)
		clinicas.PUT("/agenda/:id/status", agendaController.AtualizarStatus)
		clinicas.GET("/agenda/horarios-disponiveis", agendaController.HorariosDisponiveis)

	}

	convenios := r.Group("/convenios", middleware.Autenticado())
	{
		convenios.POST("", convenioController.Cadastrar)
		convenios.PUT("/:id", convenioController.Atualizar)
		convenios.GET("", convenioController.BuscarConvenio)
		convenios.DELETE("/:id", convenioController.Desativar)
		convenios.PUT("/:id/reativar", convenioController.Reativar)

		convenios.POST("/procedimento", convenioController.CadastrarProcedimento)
		convenios.PUT("/procedimento/:id", convenioController.AtualizarProcedimento)
		convenios.GET("/:id/procedimento", convenioController.BuscarProcedimentos)
	}

	procedimento := r.Group("/procedimentos", middleware.Autenticado())
	{
		procedimento.POST("", procedimentoController.Cadastrar)
		procedimento.PUT("/:id", procedimentoController.Atualizar)
		procedimento.GET("", procedimentoController.BuscarPorClinica)
		procedimento.DELETE("/:id", procedimentoController.Desativar)
		procedimento.PUT("/:id/reativar", procedimentoController.Reativar)
	}

	financeiro := r.Group("/financeiro", middleware.Autenticado(), verificarPermissao.VerificaPermissaoTela)
	{
		financeiro.GET("/abrir", financeiroController.Abrir)
	}

	admin := r.Group("/admin", middleware.Autenticado(), validacaoAdm)
	{
		//Assinaturas
		admin.POST("/assinaturas", adminController.CriarAssinatura)
		admin.GET("/assinaturas", adminController.ListarAssinaturas)
		admin.GET("/clinicas/:id/assinatura", adminController.ConsultarAssinaturaClinica)

		//Telas
		admin.POST("/telas", adminController.CriarTela)
		admin.GET("/telas", adminController.ListarTelas)
		admin.PUT("/telas/:id", adminController.AtualizarTela)
		admin.DELETE("/telas/:id", adminController.DesativarTela)
		admin.PUT("/telas/:id/reativar", adminController.ReativarTela)

		//Planos
		admin.GET("/planos/Listar", adminController.ListarPlanos)
		admin.POST("/planos/Criar", adminController.CriarPlano)
		admin.PUT("/planos/Associar", adminController.AssociarPlanoTela)
		admin.PUT("/planos/:id", adminController.AtualizarPlano)
		admin.DELETE("/planos/:id", adminController.DesativarPlano)
		admin.PUT("/planos/:id/reativar", adminController.ReativarPlano)

		//Plano e telas
		admin.GET("/planos/:id/telas", adminController.ListarTelasDoPlano)
		admin.DELETE("/planos/:id/telas/:tela_id", adminController.RemoverTelaDoPlano)

		//Usuarios
		admin.GET("/usuarios", usuarioController.ListarTodos)

		//Clinicas
		admin.GET("/clinicas", clinicaController.Listar)
	}

}
