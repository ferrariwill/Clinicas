package models

import (
	"time"

	"gorm.io/gorm"
)

type Paciente struct {
	gorm.Model
	Nome           string `json:"nome"`
	CPF            string `json:"cpf"`
	DataNascimento string `json:"data_nascimento"`
	Telefone       string `json:"telefone"`
	Whatsapp       bool   `json:"whatsapp"`
	Email          string `json:"email"`
	Genero         string `json:"genero"`
	ClinicaID      uint   `json:"clinica_id"`
	Ativo          bool   `json:"ativo"`
	DataConsentimento      *time.Time `json:"data_consentimento"`
	PodeReceberNotificacoes bool      `json:"pode_receber_notificacoes" gorm:"default:false"`

	Clinica    Clinica   `gorm:"foreignKey:ClinicaID" json:"clinica"`
	ConvenioID *uint     `json:"convenio_id"`
	Convenio   *Convenio `gorm:"foreignKey:ConvenioID" json:"convenio"`
	// AsaasCustomerID cache do cliente no gateway (opcional).
	AsaasCustomerID string `json:"asaas_customer_id,omitempty" gorm:"size:64"`
	// PlanoRetornoPrevistoEm: data/hora do próximo retorno ou da 1ª sessão do plano (lembrete no perfil).
	PlanoRetornoPrevistoEm *time.Time `json:"plano_retorno_previsto_em,omitempty"`
	// PlanoSessoesPrevistas: total de sessões previstas quando o plano é por sessões (nil = modo só retorno ou não definido).
	PlanoSessoesPrevistas *int `json:"plano_sessoes_previstas,omitempty"`
}
