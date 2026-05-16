package services

import (
	"errors"
	"strings"

	"github.com/ferrariwill/Clinicas/API/internal/especialidade"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
)

type ProcedimentoService interface {
	Criar(procedimento *models.Procedimento) error
	BuscarTodos(ativo *bool) ([]models.Procedimento, error)
	BuscarPorId(id uint) (*models.Procedimento, error)
	BuscarPorClinica(clinicaID uint, ativo *bool, filtroEspecialidade *string) ([]models.Procedimento, error)
	Atualizar(procedimento *models.Procedimento) error
	Desativar(id uint, clinicaID uint) error
	Reativar(id uint, clinicaID uint) error
}

type procedimentoService struct {
	repo         repositories.ProcedimentoRepository
	convenioRepo repositories.ConvenioRepository
}

func NovoProcedimentoService(repo repositories.ProcedimentoRepository, convenioRepo repositories.ConvenioRepository) ProcedimentoService {
	return &procedimentoService{repo: repo, convenioRepo: convenioRepo}
}

func normalizarEspecialidadeProcedimento(p *models.Procedimento) error {
	t := strings.TrimSpace(p.Especialidade)
	if t == "" {
		p.Especialidade = ""
		return nil
	}
	n := especialidade.Normalizar(t)
	if !especialidade.Valida(n) {
		return errors.New("especialidade inválida: use MEDICO, FISIOTERAPEUTA, DENTISTA ou vazio para todas")
	}
	p.Especialidade = n
	return nil
}

func (s *procedimentoService) Criar(procedimento *models.Procedimento) error {
	if err := normalizarEspecialidadeProcedimento(procedimento); err != nil {
		return err
	}
	err := s.repo.Criar(procedimento)
	if err != nil {
		return err
	}

	convenios, err := s.convenioRepo.BuscarPorClinica(procedimento.ClinicaID, nil)

	if err != nil {
		return err
	}

	for _, convenio := range convenios {
		err = s.convenioRepo.CadastrarProcedimento(models.ConvenioProcedimento{
			ConvenioID:     convenio.ID,
			ProcedimentoID: procedimento.ID,
			Valor:          0,
			Ativo:          true,
		})
	}

	return err
}

func (s *procedimentoService) BuscarTodos(ativo *bool) ([]models.Procedimento, error) {
	return s.repo.BuscarTodos(ativo)
}

func (s *procedimentoService) BuscarPorId(id uint) (*models.Procedimento, error) {
	return s.repo.BuscarPorID(id)
}

func (s *procedimentoService) BuscarPorClinica(clinicaID uint, ativo *bool, filtroEspecialidade *string) ([]models.Procedimento, error) {
	list, err := s.repo.BuscarPorClinica(clinicaID, ativo)
	if err != nil {
		return nil, err
	}
	if filtroEspecialidade == nil {
		return list, nil
	}
	esp := strings.TrimSpace(*filtroEspecialidade)
	if esp == "" {
		return list, nil
	}
	n := especialidade.Normalizar(esp)
	if !especialidade.Valida(n) {
		return list, nil
	}
	out := make([]models.Procedimento, 0, len(list))
	for _, p := range list {
		tag := strings.TrimSpace(strings.ToUpper(p.Especialidade))
		if tag == "" || tag == n {
			out = append(out, p)
		}
	}
	return out, nil
}

func (s *procedimentoService) Atualizar(procedimento *models.Procedimento) error {
	if err := normalizarEspecialidadeProcedimento(procedimento); err != nil {
		return err
	}
	return s.repo.Atualizar(procedimento)
}

func (s *procedimentoService) Desativar(id uint, clinicaID uint) error {
	err := s.repo.Desativar(id, clinicaID)
	if err != nil {
		return err
	}

	convenios, err := s.convenioRepo.BuscarPorClinica(clinicaID, nil)

	if err != nil {
		return err
	}

	for _, convenio := range convenios {
		err = s.convenioRepo.DesativaProcedimentoPorConvenio(convenio.ID, id)
		if err != nil {
			return err
		}
	}

	return err
}

func (s *procedimentoService) Reativar(id uint, clinicaID uint) error {
	err := s.repo.Reativar(id, clinicaID)
	if err != nil {
		return err
	}

	convenios, err := s.convenioRepo.BuscarPorClinica(clinicaID, nil)

	if err != nil {
		return err
	}

	for _, convenio := range convenios {
		err = s.convenioRepo.ReativaProcedimentoPorConvenio(convenio.ID, id)
		if err != nil {
			return err
		}
	}

	return err
}
