package services

import (
	"errors"

	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type ClinicaService interface {
	CadastrarClinica(c *models.Clinica) error
	ListarClinicas(soAtivas *bool) ([]*models.Clinica, error)
	BuscarPorID(id uint) (*models.Clinica, error)
	AtualizarClinica(c *models.Clinica, usuarioClinicaID uint, tipoUsuarioID uint) error
	DesativarClinica(id uint) error
	ReativarClinica(id uint) error
}

type clinicaService struct {
	repo repositories.ClinicaRepository
}

func NovoClinicaService(clinicaRepository repositories.ClinicaRepository) ClinicaService {
	return &clinicaService{clinicaRepository}
}

func (s *clinicaService) CadastrarClinica(c *models.Clinica) error {
	c.Ativa = true
	return s.repo.CriarClinica(c)
}

func (s *clinicaService) ListarClinicas(soAtivas *bool) ([]*models.Clinica, error) {
	return s.repo.ListarClinicas(soAtivas)
}

func (s *clinicaService) BuscarPorID(id uint) (*models.Clinica, error) {
	return s.repo.BuscarPorId(id)
}

func (s *clinicaService) AtualizarClinica(c *models.Clinica, usuarioClinicaID uint, tipoUsuarioID uint) error {
	// Admin global pode tudo
	if tipoUsuarioID == 1 {
		return s.repo.AtualiazarClinica(c)
	}

	// Verifica se a clínica pertence ao usuário
	clinicaAtual, err := s.repo.BuscarPorId(c.ID)
	if err != nil {
		return err
	}

	if clinicaAtual.ID != usuarioClinicaID {
		return errors.New("usuário não tem permissão para atualizar esta clínica")
	}

	return s.repo.AtualiazarClinica(c)
}

func (s *clinicaService) DesativarClinica(id uint) error {
	return s.repo.DesativarClinica(id)
}

func (s *clinicaService) ReativarClinica(id uint) error {
	return s.repo.ReativarClinica(id)
}
