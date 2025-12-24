package database

import (
	"log"
	"os"

	"github.com/ferrariwill/Clinicas/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func RunMigrations(db *gorm.DB) {
	err := db.AutoMigrate(
		&models.Clinica{},
		&models.TipoUsuario{},
		&models.Usuario{},
		&models.Funcionalidade{},
		&models.Permissao{},
		&models.Paciente{},
		&models.Procedimento{},
		&models.Convenio{},
		&models.StatusAgendamento{},
		&models.Agenda{},
		&models.ClinicaConfiguracao{},
		&models.UsuarioHorario{},
	)

	if err != nil {
		log.Fatal("Erro ao rodar as migrations: ", err)
	}

	log.Println("Migrations executadas com sucesso.")

	// Criar dados iniciais
	createInitialData(db)
}

func createInitialData(db *gorm.DB) {
	// Criar clínica padrão
	var clinica models.Clinica
	if err := db.Where("cnpj = ?", "00.000.000/0001-00").First(&clinica).Error; err != nil {
		clinica = models.Clinica{
			Nome:             "Clínica Admin",
			CNPJ:             "00.000.000/0001-00",
			EmailResponsavel: "admin@clinica.com",
			Capacidade:       100,
			Ativa:            true,
		}
		db.Create(&clinica)
		log.Println("Clínica admin criada")
	}

	// Criar tipo usuário admin
	var tipoAdmin models.TipoUsuario
	if err := db.Where("nome = ?", "Administrador").First(&tipoAdmin).Error; err != nil {
		tipoAdmin = models.TipoUsuario{
			Nome:      "Administrador",
			Descricao: "Administrador do sistema",
			ClinicaID: clinica.ID,
		}
		db.Create(&tipoAdmin)
		log.Println("Tipo usuário admin criado")
	}

	// Criar usuário admin
	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if adminEmail == "" {
		adminEmail = "admin@admin.com"
	}
	if adminPassword == "" {
		adminPassword = "admin123"
	}

	var admin models.Usuario
	if err := db.Where("email = ?", adminEmail).First(&admin).Error; err != nil {
		senhaHash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
		admin = models.Usuario{
			Nome:          "Administrador",
			Email:         adminEmail,
			Senha:         string(senhaHash),
			Ativo:         true,
			ClinicaID:     clinica.ID,
			TipoUsuarioID: tipoAdmin.ID,
		}
		db.Create(&admin)
		log.Printf("Usuário admin criado - Email: %s | Senha: %s", adminEmail, adminPassword)
	}
}
