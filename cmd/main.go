package main

import (
	"log"
	"os"

	"github.com/ferrariwill/Clinicas/database"
	_ "github.com/ferrariwill/Clinicas/docs"
	"github.com/ferrariwill/Clinicas/routes"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title API Clínicas
// @version 1.0
// @description API para gestão de clínicas, procedimentos e agendamentos
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
