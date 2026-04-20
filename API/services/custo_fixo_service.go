package services

import (
	"fmt"

	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/repositories"
)

type CustoFixoService interface {
	Listar(clinicaID uint, soAtivos *bool) ([]models.CustoFixo, error)
	Criar(clinicaID uint, descricao string, valorMensal float64) (models.CustoFixo, error)
	Atualizar(clinicaID, id uint, descricao string, valorMensal float64, ativo bool) (models.CustoFixo, error)
}

type custoFixoService struct {
	repo repositories.CustoFixoRepository
}

func NovoCustoFixoService(repo repositories.CustoFixoRepository) CustoFixoService {
	return &custoFixoService{repo}
}

func (s *custoFixoService) Listar(clinicaID uint, soAtivos *bool) ([]models.CustoFixo, error) {
	return s.repo.ListarPorClinica(clinicaID, soAtivos)
}

func (s *custoFixoService) Criar(clinicaID uint, descricao string, valorMensal float64) (models.CustoFixo, error) {
	if descricao == "" || valorMensal <= 0 {
		return models.CustoFixo{}, fmt.Errorf("descrição e valor mensal válidos são obrigatórios")
	}
	c := models.CustoFixo{
		ClinicaID:   clinicaID,
		Descricao:   descricao,
		ValorMensal: valorMensal,
		Ativo:       true,
	}
	if err := s.repo.Criar(&c); err != nil {
		return models.CustoFixo{}, err
	}
	return c, nil
}

func (s *custoFixoService) Atualizar(clinicaID, id uint, descricao string, valorMensal float64, ativo bool) (models.CustoFixo, error) {
	if descricao == "" || valorMensal <= 0 {
		return models.CustoFixo{}, fmt.Errorf("descrição e valor mensal válidos são obrigatórios")
	}
	ex, err := s.repo.BuscarPorIDClinica(id, clinicaID)
	if err != nil {
		return models.CustoFixo{}, err
	}
	ex.Descricao = descricao
	ex.ValorMensal = valorMensal
	ex.Ativo = ativo
	if err := s.repo.Atualizar(ex); err != nil {
		return models.CustoFixo{}, err
	}
	return *ex, nil
}
