package DTO

type CriarTipoUsuarioDTO struct {
	Nome      string `json:"nome" binding:"required"`
	Descricao string `json:"descricao" binding:"required"`
	// Papel: ADM_GERAL, DONO, MEDICO ou SECRETARIA (RBAC por clínica).
	Papel string `json:"papel" binding:"required"`
}
