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