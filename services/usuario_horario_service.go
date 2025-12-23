package services

import (
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type UsuarioHorarioService interface {
	BuscarHorarios(usuarioID uint) ([]dto.UsuarioHorarioResponse, error)
	DefinirHorarios(usuarioID uint, req *dto.DefinirHorariosRequest) error
}

type usuarioHorarioService struct {
	repo repositories.UsuarioHorarioRepository
}

func NovoUsuarioHorarioService(repo repositories.UsuarioHorarioRepository) UsuarioHorarioService {
	return &usuarioHorarioService{repo: repo}
}

func (s *usuarioHorarioService) BuscarHorarios(usuarioID uint) ([]dto.UsuarioHorarioResponse, error) {
	horarios, err := s.repo.BuscarPorUsuario(usuarioID)
	if err != nil {
		return nil, err
	}

	diasSemana := []string{"Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"}
	
	var response []dto.UsuarioHorarioResponse
	for _, h := range horarios {
		response = append(response, dto.UsuarioHorarioResponse{
			ID:             h.ID,
			UsuarioID:      h.UsuarioID,
			DiaSemana:      h.DiaSemana,
			DiaSemanaTexto: diasSemana[h.DiaSemana],
			HorarioInicio:  h.HorarioInicio,
			HorarioFim:     h.HorarioFim,
			Ativo:          h.Ativo,
		})
	}

	return response, nil
}

func (s *usuarioHorarioService) DefinirHorarios(usuarioID uint, req *dto.DefinirHorariosRequest) error {
	var horarios []models.UsuarioHorario
	
	for _, h := range req.Horarios {
		horarios = append(horarios, models.UsuarioHorario{
			DiaSemana:     h.DiaSemana,
			HorarioInicio: h.HorarioInicio,
			HorarioFim:    h.HorarioFim,
			Ativo:         h.Ativo,
		})
	}

	return s.repo.DefinirHorarios(usuarioID, horarios)
}