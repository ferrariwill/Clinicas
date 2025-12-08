package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type ProcedimentoService interface {
	Criar(procedimento *models.Procedimento) error
	BuscarTodos(ativo *bool) ([]models.Procedimento, error)
	BuscarPorId(id uint) (*models.Procedimento, error)
	BuscarPorClinica(clinicaID uint, ativo *bool) ([]models.Procedimento, error)
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

func (s *procedimentoService) Criar(procedimento *models.Procedimento) error {
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

func (s *procedimentoService) BuscarPorClinica(clinicaID uint, ativo *bool) ([]models.Procedimento, error) {
	return s.repo.BuscarPorClinica(clinicaID, ativo)
}

func (s *procedimentoService) Atualizar(procedimento *models.Procedimento) error {
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
