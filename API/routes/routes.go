package routes

import (
	"net/url"
	"os"
	"strings"
	"time"
	_ "github.com/ferrariwill/Clinicas/API/internal/logger"

	"github.com/ferrariwill/Clinicas/API/controllers"
	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/internal/mail"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func parseCORSOrigins() []string {
	raw := os.Getenv("CORS_ORIGINS")
	var out []string
	for _, p := range strings.Split(raw, ",") {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		// Next em dev costuma ser localhost ou 127.0.0.1; portas 3000/3001 (Cursor às vezes usa 3001).
		out = []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:3001",
			"http://127.0.0.1:3001",
		}
	}
	return out
}

func allowDevLocalhostOrigin(origin string, allowedOrigins []string) bool {
	origin = strings.TrimSpace(origin)
	if origin == "" {
		return false
	}
	for _, a := range allowedOrigins {
		if strings.EqualFold(strings.TrimSpace(a), origin) {
			return true
		}
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	h := strings.ToLower(u.Hostname())
	// Em dev, permitir localhost/loopback em qualquer porta para evitar 403 no preflight
	// quando o Next escolhe porta livre automaticamente.
	return h == "localhost" || h == "127.0.0.1" || h == "::1"
}

func SetupRoutes(r *gin.Engine, db *gorm.DB) {

	allowedOrigins := parseCORSOrigins()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowOriginFunc: func(origin string) bool {
			return allowDevLocalhostOrigin(origin, allowedOrigins)
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Clinic-ID"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	validacaoAdm := middleware.AutenticadoAdmin()
	planoTelaRepo := repositories.NovoPlanoTelaRepository(db)
	planoTelaSevice := services.NovoPlanoTelaService(planoTelaRepo)

	//Inicializacao de repositorios
	usurioRepo := repositories.NovoUsuarioRepository(db)
	usuarioClinicaRepo := repositories.NovoUsuarioClinicaRepository(db)
	clinicaRepo := repositories.NovaClinicaRepository(db)
	tokenRepo := repositories.NovoTokenRepository(db)
	telaRepo := repositories.NovaTelaRepository(db)
	planoRepo := repositories.NovoPlanoRepository(db)
	assinaturaRepo := repositories.NovaAssinaturaRepository(db)
	procedimentoRepo := repositories.NovoProcedimentoRepository(db)
	convenioRepo := repositories.NovoConvenioRepository(db)
	pacienteRepo := repositories.NovoPacienteRepository(db)
	agendaRepo := repositories.NovaAgendaRepository(db)
	prontuarioRepo := repositories.NovoProntuarioRepository(db)
	auditLogRepo := repositories.NovoAuditLogRepository(db)
	dashboardRepo := repositories.NovoDashboardRepository(db)
	lancamentoFinanceiroRepo := repositories.NovoLancamentoFinanceiroRepository(db)
	custoFixoRepo := repositories.NovoCustoFixoRepository(db)
	configuracaoRepo := repositories.NovaConfiguracaoRepository(db)
	usuarioHorarioRepo := repositories.NovoUsuarioHorarioRepository(db)
	tipoUsuarioRepo := repositories.NovoTipoUsuarioRepository(db)
	permissaoTelaRepo := repositories.NovoPermissaoTelaRepository(db)

	smtpSender := mail.FromEnv()

	//Inicializacao de services
	authService := services.NovoAuthService(usurioRepo, usuarioClinicaRepo, tipoUsuarioRepo, clinicaRepo, tokenRepo, smtpSender)
	usuarioService := services.NovoUsuarioService(usurioRepo, usuarioClinicaRepo, smtpSender)
	clinicaService := services.NovoClinicaService(clinicaRepo)
	telaService := services.NovaTelaService(telaRepo)
	planoService := services.NovoPlanoService(planoRepo)
	assinaturaService := services.NovaAssinaturaService(assinaturaRepo)
	procedimentoService := services.NovoProcedimentoService(procedimentoRepo, convenioRepo)
	convenioService := services.NovoConvenioService(convenioRepo, procedimentoRepo)
	pacienteService := services.NovoPacienteService(pacienteRepo)
	agendaService := services.NovaAgendaService(agendaRepo)
	prontuarioService := services.NovoProntuarioService(prontuarioRepo, pacienteRepo)
	dashboardService := services.NovoDashboardService(dashboardRepo, pacienteRepo, usurioRepo, procedimentoRepo, agendaRepo)
	lancamentoFinanceiroService := services.NovoLancamentoFinanceiroService(lancamentoFinanceiroRepo)
	custoFixoService := services.NovoCustoFixoService(custoFixoRepo)
	configuracaoService := services.NovaConfiguracaoService(configuracaoRepo)
	tipoUsuarioService := services.NovoTipoUsuarioService(tipoUsuarioRepo)
	permissaoTelaService := services.NovoPermissaoTelaService(permissaoTelaRepo, telaService, tipoUsuarioService)
	usuarioHorarioService := services.NovoUsuarioHorarioService(usuarioHorarioRepo)

	//Inicialização do middleware de permissao por tipo de usuário
	verificarPermissaoTipoUsuario := middleware.NovaVerificacaoTipoUsuarioMiddleware(permissaoTelaService)

	//Inicializacao de controllers
	usuarioController := controllers.NovoUsuarioController(usuarioService, usuarioHorarioService, assinaturaService, planoService)
	clinicaController := controllers.NovaClinicaController(clinicaService, configuracaoService, usuarioService, tipoUsuarioRepo, assinaturaService)
	lancamentoFinanceiroController := controllers.NovoLancamentoFinanceiroController(lancamentoFinanceiroService, custoFixoRepo)
	custoFixoController := controllers.NovoCustoFixoController(custoFixoService)
	procedimentoController := controllers.NovoProcedimentoController(procedimentoService)
	convenioController := controllers.NovoConvenioCoontroller(convenioService)
	pacienteController := controllers.NovoPacienteController(pacienteService)
	agendaController := controllers.NovaAgendaController(agendaService)
	dashboardController := controllers.NovoDashboardController(dashboardService)
	financeiroController := controllers.NovoFinanceiroController(permissaoTelaService, auditLogRepo)
	prontuarioController := controllers.NovoProntuarioController(prontuarioService, auditLogRepo)
	tipoUsuarioController := controllers.NovoTipoUsuarioController(tipoUsuarioService)
	permissaoTelaController := controllers.NovoPermissaoTelaController(permissaoTelaService)
	clinicaGestaoController := controllers.NovoClinicaGestaoController(tipoUsuarioService, telaService, permissaoTelaService)
	adminController := controllers.NovoAdminController(planoService,
		telaService,
		planoTelaSevice,
		assinaturaService,
		auditLogRepo,
		db)

	//Endpoints referente a parte de autenticação

	r.POST("/login", controllers.LoginHandler(authService))
	r.PUT("/auth/alterar-senha", middleware.Autenticado(), controllers.AlterarSenhaHandler(authService))
	r.GET("/auth/minhas-permissoes-rotas", middleware.Autenticado(), controllers.MinhasPermissoesRotasHandler(permissaoTelaService))
	r.GET("/auth/minhas-clinicas", middleware.Autenticado(), controllers.MinhasClinicasHandler(authService))
	r.POST("/auth/trocar-clinica", middleware.Autenticado(), controllers.TrocarClinicaHandler(authService))
	r.POST("/auth/esqueci-senha", controllers.EsqueciSenhaHandler(authService))
	r.POST("/auth/redefinir-senha", controllers.RedefinirSenhaHandler(authService))

	//Endpoints do Dashboard
	dash := r.Group("/dashboard", middleware.Autenticado(), verificarPermissaoTipoUsuario.VerificaPermissaoTipoUsuario)
	{
		dash.GET("", dashboardController.Dashboard)
		dash.GET("/agendamentos-hoje", dashboardController.AgendamentosHoje)
		dash.GET("/estatisticas", dashboardController.Estatisticas)
		dash.GET("/metricas-operacionais", dashboardController.MetricasOperacionais)
	}

	//Endpoints referente a parte de usuário
	usuarios := r.Group("/usuarios", middleware.Autenticado(), verificarPermissaoTipoUsuario.VerificaPermissaoTipoUsuario)
	{
		usuarios.POST("", usuarioController.Criar)
		usuarios.GET("", usuarioController.Listar)
		usuarios.GET("/:id", usuarioController.Buscar)
		usuarios.PUT("/:id", usuarioController.Atualizar)
		usuarios.DELETE("/:id", usuarioController.Deletar)
		usuarios.PUT("/:id/reativar", usuarioController.Ativar)

		//Horários
		usuarios.GET("/:id/horarios", usuarioController.BuscarHorarios)
		usuarios.PUT("/:id/horarios", usuarioController.DefinirHorarios)
	}

	//Enspoints referente a parte de paciente
	pacientes := r.Group("/pacientes", middleware.Autenticado(), verificarPermissaoTipoUsuario.VerificaPermissaoTipoUsuario)
	{
		pacientes.POST("", pacienteController.Criar)
		pacientes.GET("", pacienteController.Listar)
		pacientes.GET("/:cpf", pacienteController.Buscar)
		pacientes.PUT("/:id", pacienteController.Atualizar)
		pacientes.DELETE("/:id", pacienteController.Desativar)
		pacientes.PUT("/:id/reativar", pacienteController.Reativar)
	}

	//endpoints referente a parte de clinica
	clinicas := r.Group("/clinicas", middleware.Autenticado(), verificarPermissaoTipoUsuario.VerificaPermissaoTipoUsuario)
	{
		clinicas.POST("", clinicaController.Criar)
		clinicas.GET("", clinicaController.Listar)
		clinicas.GET("/financeiro/resumo", lancamentoFinanceiroController.Resumo)
		clinicas.GET("/financeiro", lancamentoFinanceiroController.Listar)
		clinicas.POST("/financeiro", lancamentoFinanceiroController.Criar)
		clinicas.GET("/custos-fixos", custoFixoController.Listar)
		clinicas.POST("/custos-fixos", custoFixoController.Criar)
		clinicas.PUT("/custos-fixos/:id", custoFixoController.Atualizar)
		clinicas.GET("/tipos-usuario", tipoUsuarioController.Listar)
		gestao := clinicas.Group("/gestao", middleware.ExigePapeis(rbac.PapelDono, rbac.PapelADMGeral))
		{
			gestao.GET("/telas", clinicaGestaoController.ListarTelas)
			gestao.GET("/tipos-usuario", clinicaGestaoController.ListarTipos)
			gestao.POST("/tipos-usuario", clinicaGestaoController.CriarTipo)
			gestao.GET("/tipos-usuario/:id", clinicaGestaoController.BuscarTipo)
			gestao.PUT("/tipos-usuario/:id", clinicaGestaoController.AtualizarTipo)
			gestao.DELETE("/tipos-usuario/:id", clinicaGestaoController.DesativarTipo)
			gestao.PUT("/tipos-usuario/:id/reativar", clinicaGestaoController.ReativarTipo)
			gestao.POST("/permissoes-tela", clinicaGestaoController.AssociarPermissao)
			gestao.DELETE("/permissoes-tela/:tipo_usuario_id/:tela_id", clinicaGestaoController.DesassociarPermissao)
			gestao.GET("/permissoes-tela/tipo-usuario/:tipo_usuario_id", clinicaGestaoController.ListarPermissoesPorTipo)
		}

		// Rotas literais antes de /:id para não capturar "agenda", "prontuarios", etc. como id.
		clinicas.POST("/agenda", agendaController.Criar)
		clinicas.GET("/agenda", agendaController.Listar)
		clinicas.PUT("/agenda/:id/status", agendaController.AtualizarStatus)
		clinicas.GET("/agenda/horarios-disponiveis", agendaController.HorariosDisponiveis)
		clinicas.GET("/prontuarios", prontuarioController.Listar)
		clinicas.POST("/prontuarios", prontuarioController.Criar)
		clinicas.PUT("/prontuarios/:id", prontuarioController.Atualizar)
		clinicas.POST("/usuarios", usuarioController.CriarUsuarioClinica)

		clinicas.GET("/:id", clinicaController.Buscar)
		clinicas.PUT("/:id", clinicaController.Atualizar)
		clinicas.DELETE("/:id", clinicaController.Desativar)
		clinicas.PUT("/:id/reativar", clinicaController.Reativar)

		//Configurações
		clinicas.GET("/:id/configuracoes", clinicaController.BuscarConfiguracoes)
		clinicas.PUT("/:id/configuracoes", clinicaController.AtualizarConfiguracoes)

	}

	convenios := r.Group("/convenios", middleware.Autenticado(), verificarPermissaoTipoUsuario.VerificaPermissaoTipoUsuario)
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

	procedimento := r.Group("/procedimentos", middleware.Autenticado(), verificarPermissaoTipoUsuario.VerificaPermissaoTipoUsuario)
	{
		procedimento.POST("", procedimentoController.Cadastrar)
		procedimento.PUT("/:id", procedimentoController.Atualizar)
		procedimento.GET("", procedimentoController.BuscarPorClinica)
		procedimento.DELETE("/:id", procedimentoController.Desativar)
		procedimento.PUT("/:id/reativar", procedimentoController.Reativar)
	}

	financeiro := r.Group("/financeiro", middleware.Autenticado(), verificarPermissaoTipoUsuario.VerificaPermissaoTipoUsuario)
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

		//Tipos de Usuário
		admin.POST("/tipos-usuario", tipoUsuarioController.Criar)
		admin.GET("/tipos-usuario", tipoUsuarioController.Listar)
		admin.GET("/tipos-usuario/:id", tipoUsuarioController.Buscar)
		admin.PUT("/tipos-usuario/:id", tipoUsuarioController.Atualizar)
		admin.DELETE("/tipos-usuario/:id", tipoUsuarioController.Desativar)
		admin.PUT("/tipos-usuario/:id/reativar", tipoUsuarioController.Reativar)

		//Permissões de Tela
		admin.POST("/permissoes-tela", permissaoTelaController.Associar)
		admin.DELETE("/permissoes-tela/:tipo_usuario_id/:tela_id", permissaoTelaController.Desassociar)
		admin.GET("/permissoes-tela/tipo-usuario/:tipo_usuario_id", permissaoTelaController.ListarTelasPorTipoUsuario)
		admin.GET("/permissoes-tela/tela/:tela_id", permissaoTelaController.ListarTiposUsuarioPorTela)
		admin.GET("/permissoes-tela/verificar/:tipo_usuario_id/:tela_id", permissaoTelaController.VerificarPermissao)
		admin.GET("/audit-logs", adminController.ListarAuditLogs)
		admin.POST("/retention/run", adminController.RunRetention)
	}

	apiV1Admin := r.Group("/api/v1/admin", middleware.Autenticado(), validacaoAdm)
	{
		apiV1Admin.GET("/audit-logs", adminController.ListarAuditLogs)
		apiV1Admin.POST("/retention/run", adminController.RunRetention)
	}

}
