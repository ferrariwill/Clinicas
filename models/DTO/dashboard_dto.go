package DTO

// DashboardResponse representa o dashboard principal
type DashboardResponse struct {
	TotalPacientes      int                   `json:"total_pacientes"`
	TotalUsuarios       int                   `json:"total_usuarios"`
	TotalProcedimentos  int                   `json:"total_procedimentos"`
	AgendamentosHoje    int                   `json:"agendamentos_hoje"`
	AgendamentosSemana  int                   `json:"agendamentos_semana"`
	ReceitaMes          float64               `json:"receita_mes"`
	PacientesAtivos     int                   `json:"pacientes_ativos"`
	ProximosAgendamentos []AgendamentoResumo  `json:"proximos_agendamentos"`
}

// AgendamentoHojeResponse representa agendamentos do dia
type AgendamentoHojeResponse struct {
	ID              uint   `json:"id"`
	Horario         string `json:"horario"`
	PacienteNome    string `json:"paciente_nome"`
	ProcedimentoNome string `json:"procedimento_nome"`
	UsuarioNome     string `json:"usuario_nome"`
	Status          string `json:"status"`
	Observacoes     string `json:"observacoes"`
}

// EstatisticasResponse representa estatísticas da clínica
type EstatisticasResponse struct {
	PacientesPorMes     []EstatisticaMensal    `json:"pacientes_por_mes"`
	AgendamentosPorMes  []EstatisticaMensal    `json:"agendamentos_por_mes"`
	ReceitaPorMes       []EstatisticaMensal    `json:"receita_por_mes"`
	ProcedimentosPopulares []ProcedimentoPopular `json:"procedimentos_populares"`
}

// EstatisticaMensal representa dados mensais
type EstatisticaMensal struct {
	Mes   string  `json:"mes"`
	Total int     `json:"total"`
	Valor float64 `json:"valor,omitempty"`
}

// ProcedimentoPopular representa procedimentos mais realizados
type ProcedimentoPopular struct {
	Nome  string `json:"nome"`
	Total int    `json:"total"`
}

// AgendamentoResumo representa resumo de agendamento
type AgendamentoResumo struct {
	ID           uint   `json:"id"`
	DataHora     string `json:"data_hora"`
	Paciente     string `json:"paciente"`
	Procedimento string `json:"procedimento"`
}