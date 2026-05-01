package DTO

// CriarUsuarioPlataformaDTO cadastra outro usuário com perfil ADM_GERAL (mesma clínica-sistema do seed).
// Senha é opcional: omitida ou vazia gera senha provisória e envio de e-mail como na criação pela equipe da clínica.
type CriarUsuarioPlataformaDTO struct {
	Nome  string `json:"nome" binding:"required,min=2,max=200"`
	Email string `json:"email" binding:"required,email"`
	Senha string `json:"senha,omitempty"`
}

// AtualizarPlanoClinicaDTO altera o plano da assinatura principal da clínica.
type AtualizarPlanoClinicaDTO struct {
	PlanoID uint `json:"plano_id" binding:"required"`
}

// AtualizarAssinaturaAdminDTO atualização parcial de assinatura (admin).
// data_expiracao: YYYY-MM-DD; string vazia remove a data de expiração.
type AtualizarAssinaturaAdminDTO struct {
	PlanoID        *uint   `json:"plano_id"`
	DataExpiracao  *string `json:"data_expiracao"`
	Ativa          *bool   `json:"ativa"`
}
