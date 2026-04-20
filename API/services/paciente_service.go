package services

import (
	"errors"
	"fmt"

	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/API/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
	"gorm.io/gorm"
)

// ErrPacienteCPFDuplicado indica CPF já cadastrado na mesma clínica (ativo).
var ErrPacienteCPFDuplicado = errors.New("já existe paciente com este CPF nesta clínica")

type PacienteService interface {
	CriarPaciente(dto *dto.CriarPacienteDTO, clinicaID uint) (*models.Paciente, error)
	BuscarPacientePorCPF(cpf string, clinicaID uint) (*models.Paciente, error)
	BuscarPorIDClinica(id, clinicaID uint) (*models.Paciente, error)
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

func (s *pacienteService) CriarPaciente(dto *dto.CriarPacienteDTO, clinicaID uint) (*models.Paciente, error) {
	cpf := utils.NormalizarCPF(dto.CPF)
	if cpf == "" {
		return nil, fmt.Errorf("CPF inválido")
	}
	dto.CPF = cpf

	existente, err := s.pacienteRepository.BuscarPacientePorCPF(cpf, clinicaID)
	if err == nil && existente != nil && existente.ID != 0 {
		if existente.Ativo {
			return nil, ErrPacienteCPFDuplicado
		}
		return nil, fmt.Errorf("já existe cadastro com este CPF (inativo). Reative o paciente em vez de criar outro")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	paciente := servicedto.CriarPacienteDTO_CriarPaciente(*dto, clinicaID)
	paciente.CPF = cpf
	paciente.Ativo = true
	if err := s.pacienteRepository.CriarPaciente(&paciente); err != nil {
		return nil, err
	}
	return &paciente, nil
}

func (s *pacienteService) BuscarPacientePorCPF(cpf string, clinicaID uint) (*models.Paciente, error) {
	return s.pacienteRepository.BuscarPacientePorCPF(cpf, clinicaID)
}

func (s *pacienteService) ListarPacientes(clinicaID uint) ([]models.Paciente, error) {
	return s.pacienteRepository.ListarPacientes(clinicaID)
}

func (s *pacienteService) BuscarPorIDClinica(id, clinicaID uint) (*models.Paciente, error) {
	return s.pacienteRepository.BuscarPorIDClinica(id, clinicaID)
}

func (s *pacienteService) AtualizarPaciente(paciente *models.Paciente) error {
	if paciente.ID == 0 || paciente.ClinicaID == 0 {
		return fmt.Errorf("paciente inválido")
	}
	existente, err := s.pacienteRepository.BuscarPorIDClinica(paciente.ID, paciente.ClinicaID)
	if err != nil {
		return err
	}
	cpfNovo := utils.NormalizarCPF(paciente.CPF)
	if cpfNovo == "" {
		return fmt.Errorf("CPF inválido")
	}
	if cpfNovo != existente.CPF {
		outro, errCpf := s.pacienteRepository.BuscarPacientePorCPF(cpfNovo, paciente.ClinicaID)
		if errCpf == nil && outro.ID != 0 && outro.ID != existente.ID && outro.Ativo {
			return ErrPacienteCPFDuplicado
		}
		if errCpf != nil && !errors.Is(errCpf, gorm.ErrRecordNotFound) {
			return errCpf
		}
	}
	existente.Nome = paciente.Nome
	existente.CPF = cpfNovo
	existente.DataNascimento = paciente.DataNascimento
	existente.Telefone = paciente.Telefone
	existente.Email = paciente.Email
	existente.Whatsapp = paciente.Whatsapp
	existente.Genero = paciente.Genero
	existente.DataConsentimento = paciente.DataConsentimento
	existente.PodeReceberNotificacoes = paciente.PodeReceberNotificacoes
	if paciente.ConvenioID != nil {
		existente.ConvenioID = paciente.ConvenioID
	}
	return s.pacienteRepository.AtualizarPaciente(existente)
}

func (s *pacienteService) DesativaPaciente(id uint) error {
	return s.pacienteRepository.DesativaPaciente(id)
}

func (s *pacienteService) ReativaPaciente(id uint) error {
	return s.pacienteRepository.ReativaPaciente(id)
}
