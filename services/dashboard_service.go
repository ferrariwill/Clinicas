package services

import (
	"time"

	dto "github.com/ferrariwill/Clinicas/models/DTO"
	"github.com/ferrariwill/Clinicas/repositories"
)

type DashboardService interface {
	ObterDashboard(clinicaID uint) (*dto.DashboardResponse, error)
	ObterAgendamentosHoje(clinicaID uint) ([]dto.AgendamentoHojeResponse, error)
	ObterEstatisticas(clinicaID uint) (*dto.EstatisticasResponse, error)
}

type dashboardService struct {
	dashboardRepo repositories.DashboardRepository
}

func NovoDashboardService(
	dashboardRepo repositories.DashboardRepository,
	pacienteRepo repositories.PacienteRepository,
	usuarioRepo repositories.UsuarioRepository,
	procedimentoRepo repositories.ProcedimentoRepository,
	agendaRepo repositories.AgendaReposiory,
) DashboardService {
	return &dashboardService{
		dashboardRepo: dashboardRepo,
	}
}

func (s *dashboardService) ObterDashboard(clinicaID uint) (*dto.DashboardResponse, error) {
	hoje := time.Now()
	inicioSemana := hoje.AddDate(0, 0, -int(hoje.Weekday()))
	inicioMes := time.Date(hoje.Year(), hoje.Month(), 1, 0, 0, 0, 0, hoje.Location())

	// Buscar métricas básicas
	totalPacientes, err := s.dashboardRepo.ContarPacientes(clinicaID)
	if err != nil {
		return nil, err
	}

	totalUsuarios, err := s.dashboardRepo.ContarUsuarios(clinicaID)
	if err != nil {
		return nil, err
	}

	totalProcedimentos, err := s.dashboardRepo.ContarProcedimentos(clinicaID)
	if err != nil {
		return nil, err
	}

	agendamentosHoje, err := s.dashboardRepo.ContarAgendamentosData(clinicaID, hoje)
	if err != nil {
		return nil, err
	}

	agendamentosSemana, err := s.dashboardRepo.ContarAgendamentosPeriodo(clinicaID, inicioSemana, hoje)
	if err != nil {
		return nil, err
	}

	receitaMes, err := s.dashboardRepo.CalcularReceitaPeriodo(clinicaID, inicioMes, hoje)
	if err != nil {
		return nil, err
	}

	pacientesAtivos, err := s.dashboardRepo.ContarPacientesAtivos(clinicaID)
	if err != nil {
		return nil, err
	}

	proximosAgendamentos, err := s.dashboardRepo.ObterProximosAgendamentos(clinicaID, 5)
	if err != nil {
		return nil, err
	}

	return &dto.DashboardResponse{
		TotalPacientes:       totalPacientes,
		TotalUsuarios:        totalUsuarios,
		TotalProcedimentos:   totalProcedimentos,
		AgendamentosHoje:     agendamentosHoje,
		AgendamentosSemana:   agendamentosSemana,
		ReceitaMes:           receitaMes,
		PacientesAtivos:      pacientesAtivos,
		ProximosAgendamentos: proximosAgendamentos,
	}, nil
}

func (s *dashboardService) ObterAgendamentosHoje(clinicaID uint) ([]dto.AgendamentoHojeResponse, error) {
	hoje := time.Now()
	return s.dashboardRepo.ObterAgendamentosHoje(clinicaID, hoje)
}

func (s *dashboardService) ObterEstatisticas(clinicaID uint) (*dto.EstatisticasResponse, error) {
	agora := time.Now()
	inicioAno := time.Date(agora.Year(), 1, 1, 0, 0, 0, 0, agora.Location())

	pacientesPorMes, err := s.dashboardRepo.ObterPacientesPorMes(clinicaID, inicioAno, agora)
	if err != nil {
		return nil, err
	}

	agendamentosPorMes, err := s.dashboardRepo.ObterAgendamentosPorMes(clinicaID, inicioAno, agora)
	if err != nil {
		return nil, err
	}

	receitaPorMes, err := s.dashboardRepo.ObterReceitaPorMes(clinicaID, inicioAno, agora)
	if err != nil {
		return nil, err
	}

	procedimentosPopulares, err := s.dashboardRepo.ObterProcedimentosPopulares(clinicaID, 10)
	if err != nil {
		return nil, err
	}

	return &dto.EstatisticasResponse{
		PacientesPorMes:        pacientesPorMes,
		AgendamentosPorMes:     agendamentosPorMes,
		ReceitaPorMes:          receitaPorMes,
		ProcedimentosPopulares: procedimentosPopulares,
	}, nil
}
