// Package rbac define os papéis de acesso por clínica (RBAC).
package rbac

const (
	PapelADMGeral  = "ADM_GERAL"
	PapelDono      = "DONO"
	PapelMedico    = "MEDICO"
	PapelSecretaria = "SECRETARIA"
)

// PodeGerenciarProntuario indica quem pode criar ou editar registros clínicos.
func PodeGerenciarProntuario(papel string) bool {
	switch papel {
	case PapelADMGeral, PapelDono, PapelMedico:
		return true
	default:
		return false
	}
}

// PodeLerProntuario inclui secretária para triagem administrativa.
func PodeLerProntuario(papel string) bool {
	switch papel {
	case PapelADMGeral, PapelDono, PapelMedico, PapelSecretaria:
		return true
	default:
		return false
	}
}

// PodeAcessarFinanceiro — dono e administrador da clínica; médico conforme política (aqui: não por padrão).
func PodeAcessarFinanceiro(papel string) bool {
	switch papel {
	case PapelADMGeral, PapelDono:
		return true
	default:
		return false
	}
}
