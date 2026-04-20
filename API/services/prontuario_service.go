package services

import (
	"errors"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/utils"
	"gorm.io/gorm"
)

var ErrProntuarioImutavel = errors.New("registro de prontuário não pode ser alterado após 24 horas da criação")

type ProntuarioService interface {
	Criar(clinicaID, profissionalID uint, in *models.ProntuarioRegistro) error
	ListarPorPaciente(clinicaID, pacienteID uint, papel string) ([]models.ProntuarioRegistro, error)
	Atualizar(clinicaID uint, id uint, titulo, conteudo string) (*uint, error)
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
	in.Titulo = strings.ToUpper(strings.TrimSpace(in.Titulo))
	in.Conteudo = strings.ToUpper(strings.TrimSpace(in.Conteudo))
	encTitulo, err := utils.EncryptSensitiveField(in.Titulo)
	if err != nil {
		return err
	}
	encConteudo, err := utils.EncryptSensitiveField(in.Conteudo)
	if err != nil {
		return err
	}
	in.Titulo = encTitulo
	in.Conteudo = encConteudo
	return s.repo.Criar(clinicaID, in)
}

func (s *prontuarioService) ListarPorPaciente(clinicaID, pacienteID uint, papel string) ([]models.ProntuarioRegistro, error) {
	_, err := s.pacienteRepo.BuscarPorIDClinica(pacienteID, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("paciente não encontrado nesta clínica")
		}
		return nil, err
	}
	list, err := s.repo.ListarPorPaciente(clinicaID, pacienteID)
	if err != nil {
		return nil, err
	}
	canDecrypt := rbac.PodeDescriptografarProntuario(papel)
	for i := range list {
		if canDecrypt {
			t, err := utils.DecryptSensitiveField(list[i].Titulo)
			if err != nil {
				return nil, err
			}
			c, err := utils.DecryptSensitiveField(list[i].Conteudo)
			if err != nil {
				return nil, err
			}
			list[i].Titulo = t
			list[i].Conteudo = c
			continue
		}
		list[i].Titulo = "DADO SENSÍVEL RESTRITO"
		list[i].Conteudo = "DADO SENSÍVEL RESTRITO"
	}
	return list, nil
}

func (s *prontuarioService) Atualizar(clinicaID uint, id uint, titulo, conteudo string) (*uint, error) {
	reg, err := s.repo.BuscarPorIDClinica(id, clinicaID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("registro não encontrado")
		}
		return nil, err
	}
	if time.Now().After(reg.EditavelAte()) {
		return nil, ErrProntuarioImutavel
	}
	titulo = strings.ToUpper(strings.TrimSpace(titulo))
	conteudo = strings.ToUpper(strings.TrimSpace(conteudo))
	encTitulo, err := utils.EncryptSensitiveField(titulo)
	if err != nil {
		return nil, err
	}
	encConteudo, err := utils.EncryptSensitiveField(conteudo)
	if err != nil {
		return nil, err
	}
	if err := s.repo.AtualizarCampos(clinicaID, id, encTitulo, encConteudo); err != nil {
		return nil, err
	}
	return &reg.PacienteID, nil
}
