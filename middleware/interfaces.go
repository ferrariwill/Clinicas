package middleware

// PlanoTelaChecker interface para verificação de permissões
type PlanoTelaChecker interface {
	PlanoTemAcesso(planoID uint, rota string) (bool, error)
}