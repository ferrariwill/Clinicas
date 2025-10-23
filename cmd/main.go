package main

import (
	"log"
	"os"

	"github.com/ferrariwill/Clinicas/database"
	"github.com/ferrariwill/Clinicas/routes"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Println("Arquivo .env não encontrado")
	}

	db := database.ConnectDB()

	r := gin.Default()
	routes.SetupRoutes(r, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Servidor iniciado na porta", port)
	r.Run(":" + port)

}
