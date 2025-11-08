package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type PlanoTelaRepository interface {
	PlanoTemAcesso(planoID uint, rota string) (bool, error)
	Criar(planoTela *models.PlanoTela) error
	ListarTelasDoPlano(planoID uint) ([]models.Tela, error)
	RemoverTelaDoPlano(planoID, telaID uint) error
}

type planoTelaRepository struct {
	db *gorm.DB
}

func NovoPlanoTelaRepository(db *gorm.DB) PlanoTelaRepository {
	return &planoTelaRepository{db}
}

func (r *planoTelaRepository) PlanoTemAcesso(planoID uint, rota string) (bool, error) {
	var count int64
	err := r.db.Model(&models.PlanoTela{}).Where("plano_id = ? AND rota = ?", planoID, rota).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *planoTelaRepository) Criar(planoTela *models.PlanoTela) error {
	return r.db.Create(planoTela).Error
}

func (r *planoTelaRepository) ListarTelasDoPlano(planoID uint) ([]models.Tela, error) {
	var telas []models.Tela
	err := r.db.Table("telas").
		Joins("JOIN plano_telas ON telas.id = plano_telas.tela_id").
		Where("plano_telas.plano_id = ?", planoID).
		Find(&telas).Error
	return telas, err
}

func (r *planoTelaRepository) RemoverTelaDoPlano(planoID, telaID uint) error {
	return r.db.Where("plano_id = ? AND tela_id = ?", planoID, telaID).
		Delete(&models.PlanoTela{}).Error
}
