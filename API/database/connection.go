package database

import (
	"log/slog"
	"os"

	"github.com/ferrariwill/Clinicas/API/internal/logger"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() *gorm.DB {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		logger.L.Error("database", slog.String("event", "db_dsn_missing"))
		os.Exit(1)
	}
	// PreferSimpleProtocol + PrepareStmt=false: PgBouncer (ex. Postgres no Render) em modo transaction
	// reutiliza conexões e prepared statements com nome fixo conflitam (SQLSTATE 42P05).
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{PrepareStmt: false})
	if err != nil {
		logger.L.Error("database", slog.String("event", "connect_failed"), slog.Any("error", err))
		os.Exit(1)
	}

	DB = db
	logger.L.Info("database", slog.String("event", "connected"))
	return db
}
