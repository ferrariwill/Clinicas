package services

import (
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/repositories"
)

type PacienteService interface {
	CriarPaciente(dto *dto.CriarPacienteDTO, clinicaID uint) error
	BuscarPacientePorCPF(cpf string, clinicaID uint) (*models.Paciente, error)
	ListarPacientes(clinicaID uint) ([]models.Paciente, error)
	AtualizarPaciente(paciente *models.Paciente) error
	DesativaPaciente(id uint) error
	ReativaPaciente(id uint) error
}

type pacienteService struct {
	pacienteRepository repositories.PacienteRepository
}

func NovoPacienteService(pacienteRepository repositories.PacienteRepository) PacienteService {
	return &pacienteService{
		pacienteRepository: pacienteRepository,
	}
}

func (s *pacienteService) CriarPaciente(dto *dto.CriarPacienteDTO, clinicaID uint) error {
	paciente := servicedto.CriarPacienteDTO_CriarPaciente(*dto, clinicaID)
	paciente.Ativo = true
	return s.pacienteRepository.CriarPaciente(&paciente)
}

func (s *pacienteService) BuscarPacientePorCPF(cpf string, clinicaID uint) (*models.Paciente, error) {
	return s.pacienteRepository.BuscarPacientePorCPF(cpf, clinicaID)
}

func (s *pacienteService) ListarPacientes(clinicaID uint) ([]models.Paciente, error) {
	return s.pacienteRepository.ListarPacientes(clinicaID)
}

func (s *pacienteService) AtualizarPaciente(paciente *models.Paciente) error {
	pacienteAtualiza, err := s.pacienteRepository.BuscarPacientePorCPF(paciente.CPF, paciente.ClinicaID)
	if err != nil {
		return err
	}
	paciente.ID = pacienteAtualiza.ID
	return s.pacienteRepository.AtualizarPaciente(paciente)
}

func (s *pacienteService) DesativaPaciente(id uint) error {
	return s.pacienteRepository.DesativaPaciente(id)
}

func (s *pacienteService) ReativaPaciente(id uint) error {
	return s.pacienteRepository.ReativaPaciente(id)
}
