package repositories

import (
	"github.com/ferrariwill/Clinicas/models"
	"gorm.io/gorm"
)

type PacienteRepository interface {
	CriarPaciente(paciente *models.Paciente) error
	BuscarPacientePorCPF(cpf string, clinicaID uint) (*models.Paciente, error)
	ListarPacientes(clinicaID uint) ([]models.Paciente, error)
	AtualizarPaciente(paciente *models.Paciente) error
	DesativaPaciente(id uint) error
	ReativaPaciente(id uint) error
}

type pacienteRepository struct {
	db *gorm.DB
}

func NovoPacienteRepository(db *gorm.DB) PacienteRepository {
	return &pacienteRepository{db}
}

func (r *pacienteRepository) CriarPaciente(paciente *models.Paciente) error {
	return r.db.Create(paciente).Error
}

func (r *pacienteRepository) BuscarPacientePorCPF(cpf string, clinicaID uint) (*models.Paciente, error) {
	var paciente models.Paciente
	err := r.db.Where("cpf = ? AND clinica_id = ?", cpf, clinicaID).First(&paciente).Error
	return &paciente, err
}

func (r *pacienteRepository) ListarPacientes(clinicaID uint) ([]models.Paciente, error) {
	var pacientes []models.Paciente
	err := r.db.Where("clinica_id = ?", clinicaID).Find(&pacientes).Error
	return pacientes, err
}

func (r *pacienteRepository) AtualizarPaciente(paciente *models.Paciente) error {
	return r.db.Save(paciente).Error
}

func (r *pacienteRepository) DesativaPaciente(id uint) error {
	return r.db.Model(&models.Paciente{}).Where("id = ?", id).Update("ativo", false).Error
}

func (r *pacienteRepository) ReativaPaciente(id uint) error {
	return r.db.Model(&models.Paciente{}).Where("id = ?", id).Update("ativo", true).Error
}
