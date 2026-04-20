package main

import (
	"log"
	"os"
	_ "time/tzdata" // IANA em binário estático (ex.: Alpine sem pacote tzdata) para America/Sao_Paulo na agenda

	"github.com/ferrariwill/Clinicas/API/database"
	_ "github.com/ferrariwill/Clinicas/API/docs"
	"github.com/ferrariwill/Clinicas/API/internal/retention"
	"github.com/ferrariwill/Clinicas/API/routes"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title API White Label — Clínicas
// @version 1.0
// @description API multiclínica com isolamento por tenant (clinic_id), RBAC por papel (ADM_GERAL, DONO, MEDICO, SECRETARIA), agendamento com validação de conflitos, prontuário com imutabilidade após 24h, auditoria LGPD e métricas de faturamento e no-show.
// @host localhost:8080
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {

	// Monorepo: .env costuma ficar na raiz (../.env) quando o cwd é API/; também tenta ./.env
	if err := godotenv.Load(); err != nil {
		if err2 := godotenv.Load("../.env"); err2 != nil {
			log.Println("Arquivo .env não encontrado em ./ nem em ../ (use variáveis de ambiente ou crie .env na raiz ou em API/)")
		}
	}

	db := database.ConnectDB()

	// Verificar se é para executar apenas migrations
	if len(os.Args) > 1 && os.Args[1] == "--migrate" {
		log.Println("Executando migrations...")
		database.RunMigrations(db)
		log.Println("Migrations executadas com sucesso!")
		return
	}

	r := gin.Default()
	r.HandleMethodNotAllowed = false

	// Swagger endpoint
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	routes.SetupRoutes(r, db)
	retention.StartWorker(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Servidor iniciado na porta", port)
	log.Println("Swagger disponível em: http://localhost:" + port + "/swagger/index.html")
	r.Run(":" + port)

}
