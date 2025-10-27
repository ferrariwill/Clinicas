package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type PlanoTelaRepository interface {
	PlanoTemAcesso(planoID uint, rota string) (bool, error)
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
