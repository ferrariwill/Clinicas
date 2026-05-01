package services

import (
	"errors"

	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/repositories"
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
		ID:                    config.ID,
		ClinicaID:             config.ClinicaID,
		HorarioInicioSemana:   config.HorarioInicioSemana,
		HorarioFimSemana:      config.HorarioFimSemana,
		HorarioInicioSabado:   config.HorarioInicioSabado,
		HorarioFimSabado:      config.HorarioFimSabado,
		FuncionaDomingo:       config.FuncionaDomingo,
		HorarioInicioDomingo:  config.HorarioInicioDomingo,
		HorarioFimDomingo:     config.HorarioFimDomingo,
		IntervaloConsulta:     config.IntervaloConsulta,
		TempoAntecedencia:     config.TempoAntecedencia,
		LimiteAgendamentosDia: config.LimiteAgendamentosDia,
		PermiteAgendamentoFds: config.PermiteAgendamentoFds,
		EmailNotificacao:       config.EmailNotificacao,
		TelefoneWhatsapp:       config.TelefoneWhatsapp,
		MensagemBoasVindas:     config.MensagemBoasVindas,
		UsaCobrancaIntegrada:   config.UsaCobrancaIntegrada,
		CadastroAsaasAtivo:     config.CadastroAsaasAtivo,
		PercentualSplitSistema: config.PercentualSplitSistema,
	}, nil
}

func (s *configuracaoService) AtualizarConfiguracao(clinicaID uint, req *dto.ConfiguracaoRequest) (*dto.ConfiguracaoResponse, error) {
	if req.PercentualSplitSistema < 0 || req.PercentualSplitSistema > 100 {
		return nil, errors.New("percentual_split_sistema deve estar entre 0 e 100")
	}
	cadastroAsaas := req.CadastroAsaasAtivo
	if !req.UsaCobrancaIntegrada {
		cadastroAsaas = false
	}
	config := &models.ClinicaConfiguracao{
		ClinicaID:             clinicaID,
		HorarioInicioSemana:   req.HorarioInicioSemana,
		HorarioFimSemana:      req.HorarioFimSemana,
		HorarioInicioSabado:   req.HorarioInicioSabado,
		HorarioFimSabado:      req.HorarioFimSabado,
		FuncionaDomingo:       req.FuncionaDomingo,
		HorarioInicioDomingo:  req.HorarioInicioDomingo,
		HorarioFimDomingo:     req.HorarioFimDomingo,
		IntervaloConsulta:     req.IntervaloConsulta,
		TempoAntecedencia:     req.TempoAntecedencia,
		LimiteAgendamentosDia: req.LimiteAgendamentosDia,
		PermiteAgendamentoFds: req.PermiteAgendamentoFds,
		EmailNotificacao:       req.EmailNotificacao,
		TelefoneWhatsapp:       req.TelefoneWhatsapp,
		MensagemBoasVindas:     req.MensagemBoasVindas,
		UsaCobrancaIntegrada:   req.UsaCobrancaIntegrada,
		CadastroAsaasAtivo:     cadastroAsaas,
		PercentualSplitSistema: req.PercentualSplitSistema,
	}

	err := s.repo.CriarOuAtualizar(config)
	if err != nil {
		return nil, err
	}

	return s.BuscarConfiguracao(clinicaID)
}
