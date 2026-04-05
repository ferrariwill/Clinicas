package DTO

// CriarProntuarioDTO entrada para novo registro de prontuário.
type CriarProntuarioDTO struct {
	PacienteID uint   `json:"paciente_id" binding:"required"`
	Titulo     string `json:"titulo" binding:"required"`
	Conteudo   string `json:"conteudo" binding:"required"`
}

// AtualizarProntuarioDTO permite edição apenas na janela de 24h.
type AtualizarProntuarioDTO struct {
	Titulo   string `json:"titulo" binding:"required"`
	Conteudo string `json:"conteudo" binding:"required"`
}
