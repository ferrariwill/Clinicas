package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type TokenRepository interface {
	SalvarToken(token models.TokenRedifinicao) error
	BuscarToken(token string) (*models.TokenRedifinicao, error)
	MarcarComoUsado(token string) error
}

type tokenRepository struct {
	db *gorm.DB
}

func NovoTokenRepository(db *gorm.DB) TokenRepository {
	return &tokenRepository{db}
}

func (r *tokenRepository) SalvarToken(token models.TokenRedifinicao) error {
	return r.db.Create(&token).Error
}

func (r *tokenRepository) BuscarToken(token string) (*models.TokenRedifinicao, error) {
	var t models.TokenRedifinicao
	err := r.db.Where("token = ? and Ativo = true", token).First(&t).Error
	return &t, err
}

func (r *tokenRepository) MarcarComoUsado(token string) error {
	return r.db.Model(&models.TokenRedifinicao{}).Where("token = ?", token).Update("Ativo", false).Error
}
