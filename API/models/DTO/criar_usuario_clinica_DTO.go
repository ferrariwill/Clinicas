package DTO

type CriarUsuarioClinicaDTO struct {
	Nome          string  `json:"nome" binding:"required,min=2,max=200"`
	Email         string  `json:"email" binding:"required,email"`
	Senha         *string `json:"senha" binding:"omitempty,min=6"`
	TipoUsuarioID uint    `json:"tipo_usuario_id" binding:"required"`
	// Especialidade: MEDICO | FISIOTERAPEUTA | DENTISTA — obrigatória quando o tipo for DONO ou MEDICO.
	Especialidade string `json:"especialidade"`
	// PorcentagemRepasse: 0–100 (opcional); repasse sobre o valor bruto das consultas pagas do profissional.
	PorcentagemRepasse *float64 `json:"porcentagem_repasse"`
}
