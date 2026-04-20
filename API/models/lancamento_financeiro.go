package models

import (
	"time"

	"gorm.io/gorm"
)

// LancamentoFinanceiro registra receitas/despesas manuais da clínica (fluxo de caixa).
type LancamentoFinanceiro struct {
	gorm.Model
	ClinicaID uint      `json:"clinica_id" gorm:"index;not null"`
	UsuarioID uint      `json:"usuario_id" gorm:"index;not null"`
	Data      time.Time `json:"data" gorm:"type:date;not null"`
	Descricao string    `json:"descricao" gorm:"size:512;not null"`
	Valor     float64   `json:"valor" gorm:"not null"`
	Tipo      string    `json:"tipo" gorm:"size:16;not null"`      // RECEITA | DESPESA
	Categoria string    `json:"categoria" gorm:"size:16;not null"` // PARTICULAR | CONVENIO
}

func (LancamentoFinanceiro) TableName() string {
	return "lancamentos_financeiros"
}
