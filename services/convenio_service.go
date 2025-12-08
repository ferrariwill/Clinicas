package services

import (
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type ConvenioServices interface {
	Criar(convenio models.Convenio) error
	Atualizar(convenio *models.Convenio) error
	Desativar(id uint, clinicaID uint) error
	Reativar(id uint, clinicaID uint) error
	BuscarPorID(id uint) (*models.Convenio, error)
	BuscarPorClinica(clinicaID uint, ativo *bool) ([]models.Convenio, error)

	//Convenio procedimentos
	CadastrarProcedimento(cp models.ConvenioProcedimento) error
	BuscarProcedimentosPorConvenio(convenioID uint) ([]models.ConvenioProcedimento, error)
	AtualizaProcedimentoPorConvenio(cp *models.ConvenioProcedimento) error
	DesativaProcedimentoPorConvenio(convenioID uint, procedimentoID uint) error
	ReativaProcedimentoPorConvenio(convenioID uint, procedimentoID uint) error
}

type convenioServices struct {
	repo             repositories.ConvenioRepository
	procedimentoRepo repositories.ProcedimentoRepository
}

func NovoConvenioService(repo repositories.ConvenioRepository,
	procedimentoRepo repositories.ProcedimentoRepository) ConvenioServices {
	return &convenioServices{
		repo:             repo,
		procedimentoRepo: procedimentoRepo,
	}
}

func (s *convenioServices) Criar(convenio models.Convenio) error {
	err := s.repo.Criar(convenio)
	if err != nil {
		return err
	}

	procedimentos, err := s.procedimentoRepo.BuscarPorClinica(convenio.ClinicaID, nil)
	if err != nil {
		return err
	}

	//Cadastra todos os procedimentos do convenio
	for _, procedimento := range procedimentos {
		err = s.repo.CadastrarProcedimento(models.ConvenioProcedimento{
			ConvenioID:     convenio.ID,
			ProcedimentoID: procedimento.ID,
			Valor:          0,
			Ativo:          procedimento.Ativo,
		})
		if err != nil {
			return err
		}
	}

	return err
}

func (s *convenioServices) Atualizar(convenio *models.Convenio) error {
	return s.repo.Atualizar(convenio)
}

func (s *convenioServices) Desativar(id uint, clinicaID uint) error {
	err := s.repo.Desativar(id, clinicaID)
	if err != nil {
		return err
	}
	//Desativa todos os procedimentos do convenio
	procedimentosConvenio, err := s.repo.BuscarProcedimentosPorConvenio(id)
	if err != nil {
		return err
	}

	for _, procedimento := range procedimentosConvenio {
		err = s.repo.DesativaProcedimentoPorConvenio(id, procedimento.ProcedimentoID)
		if err != nil {
			return err
		}
	}

	return err
}

func (s *convenioServices) Reativar(id uint, clinicaID uint) error {
	err := s.repo.Reativar(id, clinicaID)
	if err != nil {
		return err
	}
	//Reativa todos os procedimentos do convenio
	procedimentosConvenio, err := s.repo.BuscarProcedimentosPorConvenio(id)
	if err != nil {
		return err
	}

	for _, procedimento := range procedimentosConvenio {
		err = s.repo.ReativaProcedimentoPorConvenio(id, procedimento.ProcedimentoID)
		if err != nil {
			return err
		}
	}

	return err

}

func (s *convenioServices) BuscarPorID(id uint) (*models.Convenio, error) {
	return s.repo.BuscarPorID(id)
}

func (s *convenioServices) BuscarPorClinica(clinicaID uint, ativo *bool) ([]models.Convenio, error) {
	return s.repo.BuscarPorClinica(clinicaID, ativo)
}

func (s *convenioServices) CadastrarProcedimento(cp models.ConvenioProcedimento) error {
	return s.repo.CadastrarProcedimento(cp)
}

func (s *convenioServices) BuscarProcedimentosPorConvenio(convenioID uint) ([]models.ConvenioProcedimento, error) {
	return s.repo.BuscarProcedimentosPorConvenio(convenioID)
}

func (s *convenioServices) AtualizaProcedimentoPorConvenio(cp *models.ConvenioProcedimento) error {
	return s.repo.AtualizaProcedimentoPorConvenio(cp)
}

func (s *convenioServices) DesativaProcedimentoPorConvenio(convenioID uint, procedimentoID uint) error {
	return s.repo.DesativaProcedimentoPorConvenio(convenioID, procedimentoID)
}

func (s *convenioServices) ReativaProcedimentoPorConvenio(convenioID uint, procedimentoID uint) error {
	return s.repo.ReativaProcedimentoPorConvenio(convenioID, procedimentoID)
}
