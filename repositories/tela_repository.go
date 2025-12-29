package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type TelaRepository interface {
	CriarTela(t *models.Tela) error
	BuscarTelaPorID(id int) (*models.Tela, error)
	BuscarTelaPorRota(rota string) (*models.Tela, error)
	ListarTelas() ([]*models.Tela, error)
	ListarTelasPorAssinatura(assinaturaID int) ([]*models.Tela, error)
	AtualizarTela(t *models.Tela) error
	Desativar(id int) error
	Reativar(id int) error
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

func (r *telaRepository) BuscarTelaPorRota(rota string) (*models.Tela, error) {
	var tela models.Tela
	err := r.db.Where("rota = ?", rota).First(&tela).Error
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
		Where("tela_assinaturas.assinatura_id = ? AND tela.Ativo = true", assinaturaID).
		Find(&telas).Error
	return telas, err
}

func (r *telaRepository) AtualizarTela(t *models.Tela) error {
	return r.db.Save(t).Error
}

func (r *telaRepository) Desativar(id int) error {
	// Lógica para marcar como inativo ao invés de deletar
	return r.db.Model(&models.Tela{}).Where("id = ?", id).Update("Ativo", false).Error
}

func (r *telaRepository) Reativar(id int) error {
	// Lógica para reativar
	return r.db.Model(&models.Tela{}).Where("id = ?", id).Update("Ativo", true).Error
}
