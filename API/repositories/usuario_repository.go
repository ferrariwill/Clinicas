package repositories

import (
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/utils"
	"gorm.io/gorm"
)

type UsuarioRepository interface {
	BuscarPorEmail(email string) (*models.Usuario, error)
	BuscarPorID(id uint) (*models.Usuario, error)
	AtualizarSenha(id uint, novaSenha string) error
	DefinirSenhaEFlagTroca(id uint, hash string, obrigarTrocaSenha bool) error
	CriarUsuario(u *models.Usuario) error
	AtualizarUsuario(u *models.Usuario) error
	AtualizarClinicaAtiva(usuarioID, clinicaID, tipoUsuarioID uint) error
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
	n := utils.NormalizarEmail(email)
	err := r.db.Preload("TipoUsuario").Where("LOWER(TRIM(email)) = ?", n).First(&usuario).Error
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

func (r *usuarioRepository) AtualizarSenha(usuarioID uint, novaSenhaHash string) error {
	return r.db.Model(&models.Usuario{}).Where("id = ?", usuarioID).Updates(map[string]interface{}{
		"senha":                novaSenhaHash,
		"obrigar_troca_senha": false,
	}).Error
}

func (r *usuarioRepository) DefinirSenhaEFlagTroca(usuarioID uint, hash string, obrigarTrocaSenha bool) error {
	return r.db.Model(&models.Usuario{}).Where("id = ?", usuarioID).Updates(map[string]interface{}{
		"senha":                hash,
		"obrigar_troca_senha": obrigarTrocaSenha,
	}).Error
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

func (r *usuarioRepository) AtualizarClinicaAtiva(usuarioID, clinicaID, tipoUsuarioID uint) error {
	return r.db.Model(&models.Usuario{}).Where("id = ?", usuarioID).Updates(map[string]interface{}{
		"clinica_id":      clinicaID,
		"tipo_usuario_id": tipoUsuarioID,
	}).Error
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
	var ucs []models.UsuarioClinica
	err := r.db.Preload("Usuario").Preload("TipoUsuario").
		Where("clinica_id = ? AND ativo = ?", clinicaID, true).
		Find(&ucs).Error
	if err != nil {
		return nil, err
	}
	out := make([]models.Usuario, 0, len(ucs))
	for _, uc := range ucs {
		u := uc.Usuario
		if soAtivos != nil && u.Ativo != *soAtivos {
			continue
		}
		u.ClinicaID = uc.ClinicaID
		u.TipoUsuarioID = uc.TipoUsuarioID
		u.TipoUsuario = uc.TipoUsuario
		out = append(out, u)
	}
	return out, nil
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
