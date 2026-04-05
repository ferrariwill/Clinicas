package DTO

// UsuarioHorarioRequest representa a requisição para definir horários do usuário
type UsuarioHorarioRequest struct {
	DiaSemana     int    `json:"dia_semana" binding:"required,min=0,max=6" example:"1"`
	HorarioInicio string `json:"horario_inicio" binding:"required" example:"08:00"`
	HorarioFim    string `json:"horario_fim" binding:"required" example:"18:00"`
	Ativo         bool   `json:"ativo" example:"true"`
}

// UsuarioHorarioResponse representa a resposta de horário do usuário
type UsuarioHorarioResponse struct {
	ID            uint   `json:"id" example:"1"`
	UsuarioID     uint   `json:"usuario_id" example:"1"`
	DiaSemana     int    `json:"dia_semana" example:"1"`
	DiaSemanaTexto string `json:"dia_semana_texto" example:"Segunda-feira"`
	HorarioInicio string `json:"horario_inicio" example:"08:00"`
	HorarioFim    string `json:"horario_fim" example:"18:00"`
	Ativo         bool   `json:"ativo" example:"true"`
}

// DefinirHorariosRequest representa a requisição para definir todos os horários
type DefinirHorariosRequest struct {
	Horarios []UsuarioHorarioRequest `json:"horarios" binding:"required"`
}