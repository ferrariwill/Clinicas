package repositories

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

type CustoFixoRepository interface {
	ListarPorClinica(clinicaID uint, soAtivos *bool) ([]models.CustoFixo, error)
	SomaMensalAtivos(clinicaID uint) (float64, error)
	Criar(c *models.CustoFixo) error
	Atualizar(c *models.CustoFixo) error
	BuscarPorIDClinica(id, clinicaID uint) (*models.CustoFixo, error)
}

type custoFixoRepository struct {
	db *gorm.DB
}

func NovoCustoFixoRepository(db *gorm.DB) CustoFixoRepository {
	return &custoFixoRepository{db}
}

func (r *custoFixoRepository) ListarPorClinica(clinicaID uint, soAtivos *bool) ([]models.CustoFixo, error) {
	var rows []models.CustoFixo
	q := r.db.Where("clinica_id = ?", clinicaID).Order("descricao asc")
	if soAtivos != nil {
		q = q.Where("ativo = ?", *soAtivos)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *custoFixoRepository) SomaMensalAtivos(clinicaID uint) (float64, error) {
	var sum float64
	err := r.db.Raw(`
		SELECT COALESCE(SUM(valor_mensal), 0)
		FROM custos_fixos
		WHERE clinica_id = ? AND ativo = ? AND deleted_at IS NULL`,
		clinicaID, true,
	).Scan(&sum).Error
	return sum, err
}

func (r *custoFixoRepository) Criar(c *models.CustoFixo) error {
	return r.db.Create(c).Error
}

func (r *custoFixoRepository) Atualizar(c *models.CustoFixo) error {
	return r.db.Save(c).Error
}

func (r *custoFixoRepository) BuscarPorIDClinica(id, clinicaID uint) (*models.CustoFixo, error) {
	var row models.CustoFixo
	err := r.db.Where("id = ? AND clinica_id = ?", id, clinicaID).First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}
