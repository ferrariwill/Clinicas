package database

import (
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() *gorm.DB {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN não encontrada nas variáveis de ambiente")
	}
	// PreferSimpleProtocol + PrepareStmt=false: PgBouncer (ex. Postgres no Render) em modo transaction
	// reutiliza conexões e prepared statements com nome fixo conflitam (SQLSTATE 42P05).
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{PrepareStmt: false})
	if err != nil {
		log.Fatal("Erro ao conectar ao banco de dados:", err)
	}

	DB = db
	log.Println("Conectado ao PostgreSQL.")
	return db
}
