package middleware

// PlanoTelaChecker interface para verificação de permissões
type PlanoTelaChecker interface {
	PlanoTemAcesso(planoID uint, rota string) (bool, error)
}

// PermissaoTelaChecker interface para verificação de permissões por tipo de usuário
type PermissaoTelaChecker interface {
	VerificarPermissaoTipoUsuario(tipoUsuarioID uint, rota string) (bool, error)
}
