package main

import (
	"log"
	"os"

	"github.com/ferrariwill/Clinicas/API/database"
	_ "github.com/ferrariwill/Clinicas/API/docs"
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

	err := godotenv.Load()
	if err != nil {
		log.Println("Arquivo .env não encontrado")
	}

	db := database.ConnectDB()

	// Verificar se é para executar migrations
	if len(os.Args) > 1 && os.Args[1] == "--migrate" {
		log.Println("Executando migrations...")
		database.RunMigrations(db)
		log.Println("Migrations executadas com sucesso!")
		return
	}

	r := gin.Default()

	// Swagger endpoint
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	routes.SetupRoutes(r, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Servidor iniciado na porta", port)
	log.Println("Swagger disponível em: http://localhost:" + port + "/swagger/index.html")
	r.Run(":" + port)

}
