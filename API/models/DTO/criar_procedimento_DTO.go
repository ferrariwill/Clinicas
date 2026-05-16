package DTO

type CriarProcedimentoDTO struct {
	Nome       string  `json:"nome"`
	Descricao  string  `json:"descricao"`
	Valor      float64 `json:"preco"`
	DuracaoMin int     `json:"duracao_min"`
	ConvenioID uint    `json:"convenio_id"`
	Ativo      bool    `json:"ativo"`
	// Opcional: vazio = todas as especialidades; caso contrário MEDICO, FISIOTERAPEUTA ou DENTISTA.
	Especialidade string `json:"especialidade"`
}
