package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type TelaRepository interface {
	CriarTela(t *models.Tela) error
	BuscarTelaPorID(id int) (*models.Tela, error)
	ListarTelas() ([]*models.Tela, error)
	ListarTelasPorAssinatura(assinaturaID int) ([]*models.Tela, error)
	AtualizarTela(t *models.Tela) error
	DeletarTela(id int) error
}

type telaRepository struct {
	db *gorm.DB
}

func NovaTelaRepository(db *gorm.DB) TelaRepository {
	return &telaRepository{db}
}

func (r *telaRepository) CriarTela(t *models.Tela) error {
	return r.db.Create(t).Error
}

func (r *telaRepository) BuscarTelaPorID(id int) (*models.Tela, error) {
	var tela models.Tela
	err := r.db.First(&tela, id).Error
	return &tela, err
}

func (r *telaRepository) ListarTelas() ([]*models.Tela, error) {
	var telas []*models.Tela
	err := r.db.Find(&telas).Error
	return telas, err
}

func (r *telaRepository) ListarTelasPorAssinatura(assinaturaID int) ([]*models.Tela, error) {
	var telas []*models.Tela
	err := r.db.Table("telas").
		Joins("JOIN tela_assinaturas ON telas.id = tela_assinaturas.tela_id").
		Where("tela_assinaturas.assinatura_id = ?", assinaturaID).
		Find(&telas).Error
	return telas, err
}

func (r *telaRepository) AtualizarTela(t *models.Tela) error {
	return r.db.Save(t).Error
}

func (r *telaRepository) DeletarTela(id int) error {
	return r.db.Delete(&models.Tela{}, id).Error
}
