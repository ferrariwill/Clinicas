package services

import (
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/repositories"
)

type ConfiguracaoService interface {
	BuscarConfiguracao(clinicaID uint) (*dto.ConfiguracaoResponse, error)
	AtualizarConfiguracao(clinicaID uint, req *dto.ConfiguracaoRequest) (*dto.ConfiguracaoResponse, error)
}

type configuracaoService struct {
	repo repositories.ConfiguracaoRepository
}

func NovaConfiguracaoService(repo repositories.ConfiguracaoRepository) ConfiguracaoService {
	return &configuracaoService{repo: repo}
}

func (s *configuracaoService) BuscarConfiguracao(clinicaID uint) (*dto.ConfiguracaoResponse, error) {
	config, err := s.repo.BuscarPorClinica(clinicaID)
	if err != nil {
		return nil, err
	}

	return &dto.ConfiguracaoResponse{
		ID:                     config.ID,
		ClinicaID:              config.ClinicaID,
		HorarioInicioSemana:    config.HorarioInicioSemana,
		HorarioFimSemana:       config.HorarioFimSemana,
		HorarioInicioSabado:    config.HorarioInicioSabado,
		HorarioFimSabado:       config.HorarioFimSabado,
		FuncionaDomingo:        config.FuncionaDomingo,
		HorarioInicioDomingo:   config.HorarioInicioDomingo,
		HorarioFimDomingo:      config.HorarioFimDomingo,
		IntervaloConsulta:      config.IntervaloConsulta,
		TempoAntecedencia:      config.TempoAntecedencia,
		LimiteAgendamentosDia:  config.LimiteAgendamentosDia,
		PermiteAgendamentoFds:  config.PermiteAgendamentoFds,
		EmailNotificacao:       config.EmailNotificacao,
		TelefoneWhatsapp:       config.TelefoneWhatsapp,
		MensagemBoasVindas:     config.MensagemBoasVindas,
	}, nil
}

func (s *configuracaoService) AtualizarConfiguracao(clinicaID uint, req *dto.ConfiguracaoRequest) (*dto.ConfiguracaoResponse, error) {
	config := &models.ClinicaConfiguracao{
		ClinicaID:              clinicaID,
		HorarioInicioSemana:    req.HorarioInicioSemana,
		HorarioFimSemana:       req.HorarioFimSemana,
		HorarioInicioSabado:    req.HorarioInicioSabado,
		HorarioFimSabado:       req.HorarioFimSabado,
		FuncionaDomingo:        req.FuncionaDomingo,
		HorarioInicioDomingo:   req.HorarioInicioDomingo,
		HorarioFimDomingo:      req.HorarioFimDomingo,
		IntervaloConsulta:      req.IntervaloConsulta,
		TempoAntecedencia:      req.TempoAntecedencia,
		LimiteAgendamentosDia:  req.LimiteAgendamentosDia,
		PermiteAgendamentoFds:  req.PermiteAgendamentoFds,
		EmailNotificacao:       req.EmailNotificacao,
		TelefoneWhatsapp:       req.TelefoneWhatsapp,
		MensagemBoasVindas:     req.MensagemBoasVindas,
	}

	err := s.repo.CriarOuAtualizar(config)
	if err != nil {
		return nil, err
	}

	return s.BuscarConfiguracao(clinicaID)
}