package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type UsuarioRepository interface {
	BuscarPorEmail(email string) (*models.Usuario, error)
	BuscarPorID(id uint) (*models.Usuario, error)
	AtualizarSenha(id uint, novaSenha string) error
	CriarUsuario(u *models.Usuario) error
	AtualizarUsuario(u *models.Usuario) error
	ListarUsuarios(soAtivos *bool) ([]models.Usuario, error)
	ListarPorClinica(clinicaID uint, soAtivos *bool) ([]models.Usuario, error)
	DesativarUsuario(id uint) error
	ReativarUsuario(id uint) error
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

func (r *usuarioRepository) BuscarPorID(id uint) (*models.Usuario, error) {
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

func (r *usuarioRepository) CriarUsuario(u *models.Usuario) error {
	return r.db.Create(u).Error
}

func (r *usuarioRepository) AtualizarUsuario(u *models.Usuario) error {
	err := r.db.Save(u).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *usuarioRepository) ListarUsuarios(soAtivos *bool) ([]models.Usuario, error) {
	var usuarios []models.Usuario
	var err error
	if soAtivos == nil {
		err = r.db.Preload("TipoUsuario").Find(&usuarios).Error
	} else {
		err = r.db.Preload("TipoUsuario").Where("ativo = ?", *soAtivos).Find(&usuarios).Error
	}
	if err != nil {
		return nil, err
	}
	return usuarios, nil
}

func (r *usuarioRepository) ListarPorClinica(clinicaID uint, soAtivos *bool) ([]models.Usuario, error) {
	var usuarios []models.Usuario
	var err error
	if soAtivos == nil {
		err = r.db.Preload("TipoUsuario").Where("clinica_id = ?", clinicaID).Find(&usuarios).Error
	} else {
		err = r.db.Preload("TipoUsuario").Where("clinica_id = ? AND ativo = ?", clinicaID, *soAtivos).Find(&usuarios).Error
	}
	if err != nil {
		return nil, err
	}
	return usuarios, nil
}

func (r *usuarioRepository) DesativarUsuario(id uint) error {
	err := r.db.Model(&models.Usuario{}).Where("id = ?", id).Update("ativo", false).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *usuarioRepository) ReativarUsuario(id uint) error {
	err := r.db.Model(&models.Usuario{}).Where("id = ?", id).Update("ativo", true).Error
	if err != nil {
		return err
	}
	return nil
}
