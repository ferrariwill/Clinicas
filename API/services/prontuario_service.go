package services

import (
	"errors"
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"gorm.io/gorm"
)

var ErrProntuarioImutavel = errors.New("registro de prontuário não pode ser alterado após 24 horas da criação")

type ProntuarioService interface {
	Criar(clinicaID, profissionalID uint, in *models.ProntuarioRegistro) error
	ListarPorPaciente(clinicaID, pacienteID uint) ([]models.ProntuarioRegistro, error)
	Atualizar(clinicaID uint, id uint, titulo, conteudo string) error
}

type prontuarioService struct {
	repo         repositories.ProntuarioRepository
	pacienteRepo repositories.PacienteRepository
}

func NovoProntuarioService(repo repositories.ProntuarioRepository, pacienteRepo repositories.PacienteRepository) ProntuarioService {
	return &prontuarioService{repo: repo, pacienteRepo: pacienteRepo}
}

func (s *prontuarioService) Criar(clinicaID, profissionalID uint, in *models.ProntuarioRegistro) error {
	if in.PacienteID == 0 {
		return errors.New("paciente é obrigatório")
	}
	_, err := s.pacienteRepo.BuscarPorIDClinica(in.PacienteID, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("paciente não encontrado nesta clínica")
		}
		return err
	}
	in.ProfissionalID = profissionalID
	return s.repo.Criar(clinicaID, in)
}

func (s *prontuarioService) ListarPorPaciente(clinicaID, pacienteID uint) ([]models.ProntuarioRegistro, error) {
	_, err := s.pacienteRepo.BuscarPorIDClinica(pacienteID, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("paciente não encontrado nesta clínica")
		}
		return nil, err
	}
	return s.repo.ListarPorPaciente(clinicaID, pacienteID)
}

func (s *prontuarioService) Atualizar(clinicaID uint, id uint, titulo, conteudo string) error {
	reg, err := s.repo.BuscarPorIDClinica(id, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("registro não encontrado")
		}
		return err
	}
	if time.Now().After(reg.EditavelAte()) {
		return ErrProntuarioImutavel
	}
	return s.repo.AtualizarCampos(clinicaID, id, titulo, conteudo)
}
