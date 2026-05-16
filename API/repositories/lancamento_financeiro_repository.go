package repositories

import (
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

type LancamentoFinanceiroRepository interface {
	Criar(l *models.LancamentoFinanceiro) error
	Listar(clinicaID uint, inicio, fim *time.Time, categoria *string) ([]models.LancamentoFinanceiro, error)
	Resumo(clinicaID uint, inicio, fim time.Time) (totalEntradas, totalSaidas float64, err error)
	// ListarLivresParaFechamento retorna lançamentos no período ainda não vinculados a um fechamento.
	ListarLivresParaFechamento(clinicaID uint, inicio, fim time.Time) ([]models.LancamentoFinanceiro, error)
	// VincularFechamentoPeriodo associa lançamentos a um fechamento (sem hooks GORM).
	VincularFechamentoPeriodo(tx *gorm.DB, clinicaID, fechamentoID uint, lancamentoIDs []uint) error
}

type lancamentoFinanceiroRepository struct {
	db *gorm.DB
}

func NovoLancamentoFinanceiroRepository(db *gorm.DB) LancamentoFinanceiroRepository {
	return &lancamentoFinanceiroRepository{db: db}
}

func (r *lancamentoFinanceiroRepository) Criar(l *models.LancamentoFinanceiro) error {
	return r.db.Create(l).Error
}

func (r *lancamentoFinanceiroRepository) Listar(clinicaID uint, inicio, fim *time.Time, categoria *string) ([]models.LancamentoFinanceiro, error) {
	var rows []models.LancamentoFinanceiro
	q := r.db.Where("clinica_id = ?", clinicaID)
	if inicio != nil {
		q = q.Where("data >= ?", *inicio)
	}
	if fim != nil {
		q = q.Where("data <= ?", *fim)
	}
	if categoria != nil && *categoria != "" {
		q = q.Where("categoria = ?", *categoria)
	}
	err := q.Order("data desc, id desc").Find(&rows).Error
	return rows, err
}

func (r *lancamentoFinanceiroRepository) Resumo(clinicaID uint, inicio, fim time.Time) (totalEntradas, totalSaidas float64, err error) {
	row := r.db.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN tipo = 'RECEITA' THEN valor ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN tipo = 'DESPESA' THEN valor ELSE 0 END), 0)
		FROM lancamentos_financeiros
		WHERE clinica_id = ? AND deleted_at IS NULL AND data >= ? AND data <= ?`,
		clinicaID, inicio, fim,
	).Row()
	err = row.Scan(&totalEntradas, &totalSaidas)
	return totalEntradas, totalSaidas, err
}

func (r *lancamentoFinanceiroRepository) ListarLivresParaFechamento(clinicaID uint, inicio, fim time.Time) ([]models.LancamentoFinanceiro, error) {
	var rows []models.LancamentoFinanceiro
	err := r.db.Where("clinica_id = ? AND deleted_at IS NULL AND data >= ? AND data <= ? AND fechamento_periodo_id IS NULL",
		clinicaID, inicio, fim,
	).Order("data asc, id asc").Find(&rows).Error
	return rows, err
}

func (r *lancamentoFinanceiroRepository) VincularFechamentoPeriodo(tx *gorm.DB, clinicaID, fechamentoID uint, lancamentoIDs []uint) error {
	if len(lancamentoIDs) == 0 {
		return nil
	}
	db := tx
	if db == nil {
		db = r.db
	}
	return db.Session(&gorm.Session{SkipHooks: true}).
		Model(&models.LancamentoFinanceiro{}).
		Where("clinica_id = ? AND id IN ? AND fechamento_periodo_id IS NULL", clinicaID, lancamentoIDs).
		Update("fechamento_periodo_id", fechamentoID).Error
}
