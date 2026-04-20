package DTO

type CriarPacienteDTO struct {
	Nome       string `json:"nome" binding:"required"`
	CPF        string `json:"cpf" binding:"required"`
	DataNasc   string `json:"data_nasc"`
	Telefone   string `json:"telefone"`
	Email      string `json:"email"`
	ConvenioID *uint  `json:"convenio_id"` // opcional
	DataConsentimento string `json:"data_consentimento"` // YYYY-MM-DD
	PodeReceberNotificacoes bool `json:"pode_receber_notificacoes"`

}
