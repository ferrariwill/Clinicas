package controllers

// UsuarioResponse representa a resposta de usuário para Swagger
type UsuarioResponse struct {
	ID            uint   `json:"id" example:"1"`
	Nome          string `json:"nome" example:"João Silva"`
	Email         string `json:"email" example:"joao@exemplo.com"`
	TipoUsuarioID uint   `json:"tipo_usuario_id" example:"1"`
	ClinicaID     *uint  `json:"clinica_id" example:"1"`
	Ativo         bool   `json:"ativo" example:"true"`
}

// ClinicaResponse representa a resposta de clínica para Swagger
type ClinicaResponse struct {
	ID       uint   `json:"id" example:"1"`
	Nome     string `json:"nome" example:"Clínica São João"`
	Endereco string `json:"endereco" example:"Rua das Flores, 123"`
	Telefone string `json:"telefone" example:"(11) 99999-9999"`
	Email    string `json:"email" example:"contato@clinica.com"`
	CNPJ     string `json:"cnpj" example:"12.345.678/0001-90"`
	Ativo    bool   `json:"ativo" example:"true"`
}

// UsuarioRequest representa a requisição para criar usuário
type UsuarioRequest struct {
	Nome          string `json:"nome" binding:"required" example:"João Silva"`
	Email         string `json:"email" binding:"required,email" example:"joao@exemplo.com"`
	Senha         string `json:"senha" binding:"required" example:"123456"`
	TipoUsuarioID uint   `json:"tipo_usuario_id" binding:"required" example:"1"`
}

// ClinicaRequest representa a requisição para criar clínica
type ClinicaRequest struct {
	Nome     string `json:"nome" binding:"required" example:"Clínica São João"`
	Endereco string `json:"endereco" binding:"required" example:"Rua das Flores, 123"`
	Telefone string `json:"telefone" binding:"required" example:"(11) 99999-9999"`
	Email    string `json:"email" binding:"required,email" example:"contato@clinica.com"`
	CNPJ     string `json:"cnpj" binding:"required" example:"12.345.678/0001-90"`
}

// MessageResponse representa uma resposta simples com mensagem
type MessageResponse struct {
	Message string `json:"message" example:"Operação realizada com sucesso"`
}

// ErrorResponse representa uma resposta de erro
type ErrorResponse struct {
	Error string `json:"error" example:"Erro na operação"`
}

// PacienteRequest representa a requisição para criar paciente
type PacienteRequest struct {
	Nome      string `json:"nome" binding:"required" example:"Maria Silva"`
	CPF       string `json:"cpf" binding:"required" example:"123.456.789-00"`
	Telefone  string `json:"telefone" binding:"required" example:"(11) 99999-9999"`
	Email     string `json:"email" binding:"required,email" example:"maria@exemplo.com"`
	Endereco  string `json:"endereco" example:"Rua das Flores, 123"`
	DataNasc  string `json:"data_nasc" example:"1990-01-01"`
}

// PacienteResponse representa a resposta de paciente para Swagger
type PacienteResponse struct {
	ID        uint   `json:"id" example:"1"`
	Nome      string `json:"nome" example:"Maria Silva"`
	CPF       string `json:"cpf" example:"123.456.789-00"`
	Telefone  string `json:"telefone" example:"(11) 99999-9999"`
	Email     string `json:"email" example:"maria@exemplo.com"`
	Endereco  string `json:"endereco" example:"Rua das Flores, 123"`
	DataNasc  string `json:"data_nasc" example:"1990-01-01"`
	Ativo     bool   `json:"ativo" example:"true"`
	ClinicaID uint   `json:"clinica_id" example:"1"`
}

// ProcedimentoRequest representa a requisição para criar procedimento
type ProcedimentoRequest struct {
	Nome      string  `json:"nome" binding:"required" example:"Consulta Médica"`
	Descricao string  `json:"descricao" example:"Consulta médica geral"`
	Valor     float64 `json:"valor" binding:"required" example:"150.00"`
	Duracao   int     `json:"duracao" example:"30"`
}

// ProcedimentoResponse representa a resposta de procedimento para Swagger
type ProcedimentoResponse struct {
	ID        uint    `json:"id" example:"1"`
	Nome      string  `json:"nome" example:"Consulta Médica"`
	Descricao string  `json:"descricao" example:"Consulta médica geral"`
	Valor     float64 `json:"valor" example:"150.00"`
	Duracao   int     `json:"duracao" example:"30"`
	Ativo     bool    `json:"ativo" example:"true"`
	ClinicaID uint    `json:"clinica_id" example:"1"`
}

// AgendaRequest representa a requisição para criar agendamento
type AgendaRequest struct {
	PacienteID     uint   `json:"paciente_id" binding:"required" example:"1"`
	UsuarioID      uint   `json:"usuario_id" binding:"required" example:"1"`
	ProcedimentoID uint   `json:"procedimento_id" binding:"required" example:"1"`
	ConvenioID     *uint  `json:"convenio_id" example:"1"`
	DataHora       string `json:"data_hora" binding:"required" example:"2024-01-15T10:00:00Z"`
	Observacoes    string `json:"observacoes" example:"Paciente com alergia"`
}

// AgendaResponse representa a resposta de agendamento para Swagger
type AgendaResponse struct {
	ID             uint   `json:"id" example:"1"`
	PacienteID     uint   `json:"paciente_id" example:"1"`
	UsuarioID      uint   `json:"usuario_id" example:"1"`
	ProcedimentoID uint   `json:"procedimento_id" example:"1"`
	ConvenioID     *uint  `json:"convenio_id" example:"1"`
	DataHora       string `json:"data_hora" example:"2024-01-15T10:00:00Z"`
	StatusID       uint   `json:"status_id" example:"1"`
	Observacoes    string `json:"observacoes" example:"Paciente com alergia"`
	ClinicaID      uint   `json:"clinica_id" example:"1"`
}

// AtualizarStatusRequest representa a requisição para atualizar status
type AtualizarStatusRequest struct {
	StatusID uint `json:"status_id" binding:"required" example:"2"`
}

// DashboardResponse representa o dashboard principal
type DashboardResponse struct {
	TotalPacientes      int     `json:"total_pacientes" example:"150"`
	TotalUsuarios       int     `json:"total_usuarios" example:"5"`
	TotalProcedimentos  int     `json:"total_procedimentos" example:"25"`
	AgendamentosHoje    int     `json:"agendamentos_hoje" example:"12"`
	AgendamentosSemana  int     `json:"agendamentos_semana" example:"45"`
	ReceitaMes          float64 `json:"receita_mes" example:"15000.50"`
	PacientesAtivos     int     `json:"pacientes_ativos" example:"140"`
	ProximosAgendamentos []AgendamentoResumo `json:"proximos_agendamentos"`
}

// AgendamentoHojeResponse representa agendamentos do dia
type AgendamentoHojeResponse struct {
	ID              uint   `json:"id" example:"1"`
	Horario         string `json:"horario" example:"10:00"`
	PacienteNome    string `json:"paciente_nome" example:"Maria Silva"`
	ProcedimentoNome string `json:"procedimento_nome" example:"Consulta Médica"`
	UsuarioNome     string `json:"usuario_nome" example:"Dr. João"`
	Status          string `json:"status" example:"Agendado"`
	Observacoes     string `json:"observacoes" example:"Paciente com alergia"`
}

// EstatisticasResponse representa estatísticas da clínica
type EstatisticasResponse struct {
	PacientesPorMes     []EstatisticaMensal `json:"pacientes_por_mes"`
	AgendamentosPorMes  []EstatisticaMensal `json:"agendamentos_por_mes"`
	ReceitaPorMes       []EstatisticaMensal `json:"receita_por_mes"`
	ProcedimentosPopulares []ProcedimentoPopular `json:"procedimentos_populares"`
}

// EstatisticaMensal representa dados mensais
type EstatisticaMensal struct {
	Mes   string  `json:"mes" example:"2024-01"`
	Total int     `json:"total" example:"25"`
	Valor float64 `json:"valor,omitempty" example:"5000.00"`
}

// ProcedimentoPopular representa procedimentos mais realizados
type ProcedimentoPopular struct {
	Nome  string `json:"nome" example:"Consulta Médica"`
	Total int    `json:"total" example:"45"`
}

// AgendamentoResumo representa resumo de agendamento
type AgendamentoResumo struct {
	ID           uint   `json:"id" example:"1"`
	DataHora     string `json:"data_hora" example:"2024-01-15 10:00"`
	Paciente     string `json:"paciente" example:"Maria Silva"`
	Procedimento string `json:"procedimento" example:"Consulta"`
}

// ConfiguracaoRequest representa a requisição para atualizar configurações
type ConfiguracaoRequest struct {
	HorarioInicioSemana    string `json:"horario_inicio_semana" example:"08:00"`
	HorarioFimSemana       string `json:"horario_fim_semana" example:"18:00"`
	HorarioInicioSabado    string `json:"horario_inicio_sabado" example:"08:00"`
	HorarioFimSabado       string `json:"horario_fim_sabado" example:"12:00"`
	FuncionaDomingo        bool   `json:"funciona_domingo" example:"false"`
	HorarioInicioDomingo   string `json:"horario_inicio_domingo" example:""`
	HorarioFimDomingo      string `json:"horario_fim_domingo" example:""`
	IntervaloConsulta      int    `json:"intervalo_consulta" example:"30"`
	TempoAntecedencia      int    `json:"tempo_antecedencia" example:"24"`
	LimiteAgendamentosDia  int    `json:"limite_agendamentos_dia" example:"50"`
	PermiteAgendamentoFds  bool   `json:"permite_agendamento_fds" example:"false"`
	EmailNotificacao       string `json:"email_notificacao" example:"contato@clinica.com"`
	TelefoneWhatsapp       string `json:"telefone_whatsapp" example:"11999999999"`
	MensagemBoasVindas     string `json:"mensagem_boas_vindas" example:"Bem-vindo à nossa clínica!"`
}

// ConfiguracaoResponse representa a resposta de configuração
type ConfiguracaoResponse struct {
	ID                     uint   `json:"id" example:"1"`
	ClinicaID              uint   `json:"clinica_id" example:"1"`
	HorarioInicioSemana    string `json:"horario_inicio_semana" example:"08:00"`
	HorarioFimSemana       string `json:"horario_fim_semana" example:"18:00"`
	HorarioInicioSabado    string `json:"horario_inicio_sabado" example:"08:00"`
	HorarioFimSabado       string `json:"horario_fim_sabado" example:"12:00"`
	FuncionaDomingo        bool   `json:"funciona_domingo" example:"false"`
	HorarioInicioDomingo   string `json:"horario_inicio_domingo" example:""`
	HorarioFimDomingo      string `json:"horario_fim_domingo" example:""`
	IntervaloConsulta      int    `json:"intervalo_consulta" example:"30"`
	TempoAntecedencia      int    `json:"tempo_antecedencia" example:"24"`
	LimiteAgendamentosDia  int    `json:"limite_agendamentos_dia" example:"50"`
	PermiteAgendamentoFds  bool   `json:"permite_agendamento_fds" example:"false"`
	EmailNotificacao       string `json:"email_notificacao" example:"contato@clinica.com"`
	TelefoneWhatsapp       string `json:"telefone_whatsapp" example:"11999999999"`
	MensagemBoasVindas     string `json:"mensagem_boas_vindas" example:"Bem-vindo à nossa clínica!"`
}