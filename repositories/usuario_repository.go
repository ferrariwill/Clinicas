package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type UsuarioRepository interface {
	BuscarPorEmail(email string) (*models.Usuario, error)
	BuscarUsuarioPorId(id uint) (*models.Usuario, error)
	AtualizarSenha(usuarioID uint, novaSenha string) error
}

type usuarioRepository struct {
	db *gorm.DB
}

func NovoUsuarioRepository(db *gorm.DB) UsuarioRepository {
	return &usuarioRepository{db}
}

func (r *usuarioRepository) BuscarPorEmail(email string) (*models.Usuario, error) {
	var usuario models.Usuario
	err := r.db.Preload("TipoUsuario").Where("email = ?", email).First(&usuario).Error
	if err != nil {
		return nil, err
	}
	return &usuario, nil
}

func (r *usuarioRepository) BuscarUsuarioPorId(id uint) (*models.Usuario, error) {
	var usuario models.Usuario
	err := r.db.Preload("TipoUsuario").Where("id = ?", id).First(&usuario).Error
	if err != nil {
		return nil, err
	}
	return &usuario, nil
}

func (r *usuarioRepository) AtualizarSenha(usuarioID uint, novaSenha string) error {
	err := r.db.Model(&models.Usuario{}).Where("id = ?", usuarioID).Update("senha", novaSenha).Error
	if err != nil {
		return err
	}
	return nil
}
