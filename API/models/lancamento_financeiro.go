package models

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
)

// ErrLancamentoFinanceiroFechado indica que o lançamento já entrou em um fechamento finalizado.
var ErrLancamentoFinanceiroFechado = errors.New("lançamento vinculado a fechamento finalizado: alteração ou exclusão não permitida")

// LancamentoFinanceiro registra receitas/despesas manuais da clínica (fluxo de caixa).
type LancamentoFinanceiro struct {
	gorm.Model
	ClinicaID uint `json:"clinica_id" gorm:"index;not null"`
	UsuarioID uint `json:"usuario_id" gorm:"index;not null"`
	Data      time.Time `json:"data" gorm:"type:date;not null"`
	Descricao string    `json:"descricao" gorm:"size:512;not null"`
	Valor     float64   `json:"valor" gorm:"not null"`
	Tipo      string    `json:"tipo" gorm:"size:16;not null"`      // RECEITA | DESPESA
	Categoria string    `json:"categoria" gorm:"size:16;not null"` // PARTICULAR | CONVENIO

	// FechamentoPeriodoID preenchido quando o lançamento entra em um fechamento (ex.: finalizado).
	FechamentoPeriodoID *uint              `json:"fechamento_periodo_id,omitempty" gorm:"index"`
	FechamentoPeriodo   *FechamentoPeriodo `json:"fechamento_periodo,omitempty" gorm:"foreignKey:FechamentoPeriodoID"`
}

func bloqueioLancamentoSeFechamentoFinalizado(tx *gorm.DB, lancamentoID, clinicaID uint) error {
	if lancamentoID == 0 || clinicaID == 0 {
		return nil
	}
	var st string
	err := tx.Raw(`
		SELECT f.status FROM fechamentos_periodo f
		INNER JOIN lancamentos_financeiros lan ON lan.fechamento_periodo_id = f.id
		WHERE lan.id = ? AND lan.clinica_id = ? AND f.deleted_at IS NULL`,
		lancamentoID, clinicaID,
	).Scan(&st).Error
	if err != nil {
		return err
	}
	if strings.TrimSpace(st) == StatusFechamentoFinalizado {
		return ErrLancamentoFinanceiroFechado
	}
	return nil
}

// BeforeUpdate impede alterar lançamentos já vinculados a fechamento finalizado.
func (l *LancamentoFinanceiro) BeforeUpdate(tx *gorm.DB) error {
	return bloqueioLancamentoSeFechamentoFinalizado(tx, l.ID, l.ClinicaID)
}

// BeforeDelete impede excluir lançamentos já vinculados a fechamento finalizado.
func (l *LancamentoFinanceiro) BeforeDelete(tx *gorm.DB) error {
	return bloqueioLancamentoSeFechamentoFinalizado(tx, l.ID, l.ClinicaID)
}

func (LancamentoFinanceiro) TableName() string {
	return "lancamentos_financeiros"
}
