package DTO

// PreviewAgendaLoteRequest gera N datas a partir de data_referencia, nos dias_semana, à hora informada (fuso São Paulo).
// dias_semana segue time.Weekday do Go: 0=domingo … 6=sábado (igual getDay() em JavaScript).
type PreviewAgendaLoteRequest struct {
	PacienteID        uint   `json:"paciente_id" binding:"required"`
	UsuarioID         uint   `json:"usuario_id" binding:"required"`
	ProcedimentoID    uint   `json:"procedimento_id"`
	ProcedimentoIDs   []uint `json:"procedimento_ids"`
	ConvenioID        *uint  `json:"convenio_id"`
	Observacoes       string `json:"observacoes"`
	QuantidadeSessoes int    `json:"quantidade_sessoes" binding:"required,min=1,max=100"`
	DiasSemana        []int  `json:"dias_semana" binding:"required,min=1,dive,gte=0,lte=6"`
	Hora              string `json:"hora" binding:"required"`               // HH:mm
	DataReferencia    string `json:"data_referencia" binding:"required"`   // 2006-01-02
	StatusID          uint   `json:"status_id"`
}

// CriarAgendaLoteSessaoRequest uma sessão com data/hora final (após ajustes da secretaria).
type CriarAgendaLoteSessaoRequest struct {
	DataHora string `json:"data_hora" binding:"required"`
}

// CriarAgendaLoteRequest cria vários agendamentos idênticos em horários distintos.
type CriarAgendaLoteRequest struct {
	PacienteID      uint   `json:"paciente_id" binding:"required"`
	UsuarioID       uint   `json:"usuario_id" binding:"required"`
	ProcedimentoID  uint   `json:"procedimento_id"`
	ProcedimentoIDs []uint `json:"procedimento_ids"`
	ConvenioID      *uint  `json:"convenio_id"`
	Observacoes     string `json:"observacoes"`
	StatusID        uint   `json:"status_id"`
	Sessoes         []CriarAgendaLoteSessaoRequest `json:"sessoes" binding:"required,min=1,max=100,dive"`
}

// PreviewAgendaLoteSessaoResponse resultado da prévia de um slot.
type PreviewAgendaLoteSessaoResponse struct {
	Indice   int    `json:"indice"`
	DataHora string `json:"data_hora"`
	Ok       bool   `json:"ok"`
	Erro     string `json:"erro,omitempty"`
}
