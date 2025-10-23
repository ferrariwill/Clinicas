package database

import (
	"log"

	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

func RunMigrations(db *gorm.DB) {
	err := db.AutoMigrate(
		&models.Clinica{},
		&models.TipoUsuario{},
		&models.Usuario{},
		&models.Funcionalidade{},
		&models.Permissao{},
	)

	if err != nil {
		log.Fatal("Erro ao rodas as migrations: ", err)
	}

	log.Println("Migrations executadas com sucesso.")
}
