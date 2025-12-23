package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type UsuarioHorarioRepository interface {
	BuscarPorUsuario(usuarioID uint) ([]models.UsuarioHorario, error)
	DefinirHorarios(usuarioID uint, horarios []models.UsuarioHorario) error
	BuscarPorUsuarioEDia(usuarioID uint, diaSemana int) (*models.UsuarioHorario, error)
}

type usuarioHorarioRepository struct {
	db *gorm.DB
}

func NovoUsuarioHorarioRepository(db *gorm.DB) UsuarioHorarioRepository {
	return &usuarioHorarioRepository{db: db}
}

func (r *usuarioHorarioRepository) BuscarPorUsuario(usuarioID uint) ([]models.UsuarioHorario, error) {
	var horarios []models.UsuarioHorario
	err := r.db.Where("usuario_id = ?", usuarioID).Order("dia_semana").Find(&horarios).Error
	return horarios, err
}

func (r *usuarioHorarioRepository) DefinirHorarios(usuarioID uint, horarios []models.UsuarioHorario) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Remover horários existentes
		if err := tx.Where("usuario_id = ?", usuarioID).Delete(&models.UsuarioHorario{}).Error; err != nil {
			return err
		}
		
		// Criar novos horários
		for _, horario := range horarios {
			horario.UsuarioID = usuarioID
			if err := tx.Create(&horario).Error; err != nil {
				return err
			}
		}
		
		return nil
	})
}

func (r *usuarioHorarioRepository) BuscarPorUsuarioEDia(usuarioID uint, diaSemana int) (*models.UsuarioHorario, error) {
	var horario models.UsuarioHorario
	err := r.db.Where("usuario_id = ? AND dia_semana = ? AND ativo = ?", usuarioID, diaSemana, true).First(&horario).Error
	if err != nil {
		return nil, err
	}
	return &horario, nil
}