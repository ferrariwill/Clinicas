package models

import (
	"time"

	"gorm.io/gorm"
)

// Status de fechamento de período (fluxo de caixa / repasses).
const (
	StatusFechamentoAberto      = "Aberto"
	StatusFechamentoFinalizado = "Finalizado"
)

// FechamentoPeriodo consolida entradas, saídas, repasses e lucro de um intervalo na clínica,
// com snapshot JSON dos lançamentos incluídos (auditoria e rastro histórico).
type FechamentoPeriodo struct {
	gorm.Model
	ClinicaID uint `json:"clinica_id" gorm:"index;not null"`

	DataInicio time.Time `json:"data_inicio" gorm:"type:date;not null"`
	DataFim    time.Time `json:"data_fim" gorm:"type:date;not null"`

	TotalEntradas float64 `json:"total_entradas" gorm:"not null;default:0"`
	TotalSaidas   float64 `json:"total_saidas" gorm:"not null;default:0"`
	TotalRepasses float64 `json:"total_repasses" gorm:"not null;default:0"`
	LucroLiquido  float64 `json:"lucro_liquido" gorm:"not null;default:0"`

	Status string `json:"status" gorm:"size:32;not null;default:Aberto"` // Aberto | Finalizado

	// DetalhamentoJSON lista serializada dos lançamentos (e metadados) que compuseram o fechamento.
	DetalhamentoJSON []byte `json:"detalhamento_json" gorm:"type:jsonb;not null"`

	Clinica Clinica `json:"-" gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
}

func (FechamentoPeriodo) TableName() string {
	return "fechamentos_periodo"
}
