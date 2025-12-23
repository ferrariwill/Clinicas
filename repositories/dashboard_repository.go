package repositories

import (
	"time"

	dto "github.com/ferrariwill/Clinicas/models/DTO"
	"gorm.io/gorm"
)

type DashboardRepository interface {
	ContarPacientes(clinicaID uint) (int, error)
	ContarUsuarios(clinicaID uint) (int, error)
	ContarProcedimentos(clinicaID uint) (int, error)
	ContarAgendamentosData(clinicaID uint, data time.Time) (int, error)
	ContarAgendamentosPeriodo(clinicaID uint, inicio, fim time.Time) (int, error)
	CalcularReceitaPeriodo(clinicaID uint, inicio, fim time.Time) (float64, error)
	ContarPacientesAtivos(clinicaID uint) (int, error)
	ObterProximosAgendamentos(clinicaID uint, limite int) ([]dto.AgendamentoResumo, error)
	ObterAgendamentosHoje(clinicaID uint, data time.Time) ([]dto.AgendamentoHojeResponse, error)
	ObterPacientesPorMes(clinicaID uint, inicio, fim time.Time) ([]dto.EstatisticaMensal, error)
	ObterAgendamentosPorMes(clinicaID uint, inicio, fim time.Time) ([]dto.EstatisticaMensal, error)
	ObterReceitaPorMes(clinicaID uint, inicio, fim time.Time) ([]dto.EstatisticaMensal, error)
	ObterProcedimentosPopulares(clinicaID uint, limite int) ([]dto.ProcedimentoPopular, error)
}

type dashboardRepository struct {
	db *gorm.DB
}

func NovoDashboardRepository(db *gorm.DB) DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) ContarPacientes(clinicaID uint) (int, error) {
	var count int64
	err := r.db.Table("pacientes").Where("clinica_id = ?", clinicaID).Count(&count).Error
	return int(count), err
}

func (r *dashboardRepository) ContarUsuarios(clinicaID uint) (int, error) {
	var count int64
	err := r.db.Table("usuarios").Where("clinica_id = ?", clinicaID).Count(&count).Error
	return int(count), err
}

func (r *dashboardRepository) ContarProcedimentos(clinicaID uint) (int, error) {
	var count int64
	err := r.db.Table("procedimentos").Where("clinica_id = ? AND ativo = ?", clinicaID, true).Count(&count).Error
	return int(count), err
}

func (r *dashboardRepository) ContarAgendamentosData(clinicaID uint, data time.Time) (int, error) {
	var count int64
	inicio := time.Date(data.Year(), data.Month(), data.Day(), 0, 0, 0, 0, data.Location())
	fim := inicio.Add(24 * time.Hour)
	
	err := r.db.Table("agendas").
		Where("clinica_id = ? AND data_hora >= ? AND data_hora < ?", clinicaID, inicio, fim).
		Count(&count).Error
	return int(count), err
}

func (r *dashboardRepository) ContarAgendamentosPeriodo(clinicaID uint, inicio, fim time.Time) (int, error) {
	var count int64
	err := r.db.Table("agendas").
		Where("clinica_id = ? AND data_hora >= ? AND data_hora <= ?", clinicaID, inicio, fim).
		Count(&count).Error
	return int(count), err
}

func (r *dashboardRepository) CalcularReceitaPeriodo(clinicaID uint, inicio, fim time.Time) (float64, error) {
	var total float64
	err := r.db.Table("agendas").
		Select("COALESCE(SUM(procedimentos.valor), 0)").
		Joins("JOIN procedimentos ON agendas.procedimento_id = procedimentos.id").
		Where("agendas.clinica_id = ? AND agendas.data_hora >= ? AND agendas.data_hora <= ?", clinicaID, inicio, fim).
		Scan(&total).Error
	return total, err
}

func (r *dashboardRepository) ContarPacientesAtivos(clinicaID uint) (int, error) {
	var count int64
	err := r.db.Table("pacientes").Where("clinica_id = ? AND ativo = ?", clinicaID, true).Count(&count).Error
	return int(count), err
}

func (r *dashboardRepository) ObterProximosAgendamentos(clinicaID uint, limite int) ([]dto.AgendamentoResumo, error) {
	var agendamentos []dto.AgendamentoResumo
	
	err := r.db.Table("agendas").
		Select("agendas.id, agendas.data_hora, pacientes.nome as paciente, procedimentos.nome as procedimento").
		Joins("JOIN pacientes ON agendas.paciente_id = pacientes.id").
		Joins("JOIN procedimentos ON agendas.procedimento_id = procedimentos.id").
		Where("agendas.clinica_id = ? AND agendas.data_hora > ?", clinicaID, time.Now()).
		Order("agendas.data_hora ASC").
		Limit(limite).
		Scan(&agendamentos).Error
	
	return agendamentos, err
}

func (r *dashboardRepository) ObterAgendamentosHoje(clinicaID uint, data time.Time) ([]dto.AgendamentoHojeResponse, error) {
	var agendamentos []dto.AgendamentoHojeResponse
	inicio := time.Date(data.Year(), data.Month(), data.Day(), 0, 0, 0, 0, data.Location())
	fim := inicio.Add(24 * time.Hour)
	
	err := r.db.Table("agendas").
		Select(`agendas.id, 
				TIME(agendas.data_hora) as horario,
				pacientes.nome as paciente_nome,
				procedimentos.nome as procedimento_nome,
				usuarios.nome as usuario_nome,
				status_agendamentos.nome as status,
				agendas.observacoes`).
		Joins("JOIN pacientes ON agendas.paciente_id = pacientes.id").
		Joins("JOIN procedimentos ON agendas.procedimento_id = procedimentos.id").
		Joins("JOIN usuarios ON agendas.usuario_id = usuarios.id").
		Joins("JOIN status_agendamentos ON agendas.status_agendamento_id = status_agendamentos.id").
		Where("agendas.clinica_id = ? AND agendas.data_hora >= ? AND agendas.data_hora < ?", clinicaID, inicio, fim).
		Order("agendas.data_hora ASC").
		Scan(&agendamentos).Error
	
	return agendamentos, err
}

func (r *dashboardRepository) ObterPacientesPorMes(clinicaID uint, inicio, fim time.Time) ([]dto.EstatisticaMensal, error) {
	var estatisticas []dto.EstatisticaMensal
	
	err := r.db.Raw(`
		SELECT 
			DATE_FORMAT(created_at, '%Y-%m') as mes,
			COUNT(*) as total
		FROM pacientes 
		WHERE clinica_id = ? AND created_at >= ? AND created_at <= ?
		GROUP BY DATE_FORMAT(created_at, '%Y-%m')
		ORDER BY mes ASC
	`, clinicaID, inicio, fim).Scan(&estatisticas).Error
	
	return estatisticas, err
}

func (r *dashboardRepository) ObterAgendamentosPorMes(clinicaID uint, inicio, fim time.Time) ([]dto.EstatisticaMensal, error) {
	var estatisticas []dto.EstatisticaMensal
	
	err := r.db.Raw(`
		SELECT 
			DATE_FORMAT(data_hora, '%Y-%m') as mes,
			COUNT(*) as total
		FROM agendas 
		WHERE clinica_id = ? AND data_hora >= ? AND data_hora <= ?
		GROUP BY DATE_FORMAT(data_hora, '%Y-%m')
		ORDER BY mes ASC
	`, clinicaID, inicio, fim).Scan(&estatisticas).Error
	
	return estatisticas, err
}

func (r *dashboardRepository) ObterReceitaPorMes(clinicaID uint, inicio, fim time.Time) ([]dto.EstatisticaMensal, error) {
	var estatisticas []dto.EstatisticaMensal
	
	err := r.db.Raw(`
		SELECT 
			DATE_FORMAT(agendas.data_hora, '%Y-%m') as mes,
			COUNT(*) as total,
			COALESCE(SUM(procedimentos.valor), 0) as valor
		FROM agendas 
		JOIN procedimentos ON agendas.procedimento_id = procedimentos.id
		WHERE agendas.clinica_id = ? AND agendas.data_hora >= ? AND agendas.data_hora <= ?
		GROUP BY DATE_FORMAT(agendas.data_hora, '%Y-%m')
		ORDER BY mes ASC
	`, clinicaID, inicio, fim).Scan(&estatisticas).Error
	
	return estatisticas, err
}

func (r *dashboardRepository) ObterProcedimentosPopulares(clinicaID uint, limite int) ([]dto.ProcedimentoPopular, error) {
	var procedimentos []dto.ProcedimentoPopular
	
	err := r.db.Raw(`
		SELECT 
			procedimentos.nome,
			COUNT(*) as total
		FROM agendas 
		JOIN procedimentos ON agendas.procedimento_id = procedimentos.id
		WHERE agendas.clinica_id = ?
		GROUP BY procedimentos.id, procedimentos.nome
		ORDER BY total DESC
		LIMIT ?
	`, clinicaID, limite).Scan(&procedimentos).Error
	
	return procedimentos, err
}