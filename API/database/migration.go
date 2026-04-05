package database

import (
	"log"
	"os"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func RunMigrations(db *gorm.DB) {
	err := db.AutoMigrate(
		// Sem dependências
		&models.Clinica{},
		&models.Funcionalidade{},
		&models.StatusAgendamento{},
		&models.TokenRedifinicao{},
		// Dependem de Clinica
		&models.TipoUsuario{},
		&models.Plano{},
		&models.Tela{},
		// Dependem de TipoUsuario / Clinica
		&models.Usuario{},
		&models.Permissao{},
		&models.Assinatura{},
		&models.PlanoTela{},
		// Dependem de Clinica / Usuario
		&models.Paciente{},
		&models.Procedimento{},
		&models.Convenio{},
		&models.ClinicaConfiguracao{},
		&models.UsuarioHorario{},
		&models.PermissaoTela{},
		&models.AuditLog{},
		// Dependem de Paciente / Procedimento / Convenio
		&models.ConvenioProcedimento{},
		&models.Agenda{},
		&models.ProntuarioRegistro{},
	)

	if err != nil {
		log.Fatal("Erro ao rodar as migrations: ", err)
	}

	log.Println("Migrations executadas com sucesso.")

	seedStatusAgendamentos(db)
	// Criar dados iniciais
	createInitialData(db)
}

func seedStatusAgendamentos(db *gorm.DB) {
	nomes := []string{"Agendado", "Confirmado", "Realizado", "Cancelado", "Falta"}
	for _, nome := range nomes {
		var s models.StatusAgendamento
		if err := db.Where("nome = ?", nome).First(&s).Error; err != nil {
			db.Create(&models.StatusAgendamento{Nome: nome})
			log.Printf("Status de agendamento criado: %s", nome)
		}
	}
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
	if err := db.Where("nome = ? AND clinica_id = ?", "Administrador", clinica.ID).First(&tipoAdmin).Error; err != nil {
		tipoAdmin = models.TipoUsuario{
			Nome:      "Administrador",
			Descricao: "Administrador do sistema",
			Papel:     rbac.PapelADMGeral,
			ClinicaID: clinica.ID,
		}
		db.Create(&tipoAdmin)
		log.Println("Tipo usuário admin criado")
	}
	_ = db.Model(&models.TipoUsuario{}).Where("nome = ? AND clinica_id = ?", "Administrador", clinica.ID).Update("papel", rbac.PapelADMGeral)

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
