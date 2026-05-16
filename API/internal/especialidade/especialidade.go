// Package especialidade define valores de área clínica do profissional (usuário).
package especialidade

import (
	"errors"
	"strings"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
)

const (
	Medico         = "MEDICO"
	Fisioterapeuta = "FISIOTERAPEUTA"
	Dentista       = "DENTISTA"
)

// Normalizar devolve o código em maiúsculas sem espaços.
func Normalizar(s string) string {
	return strings.TrimSpace(strings.ToUpper(s))
}

// Valida indica se o código é um dos valores permitidos.
func Valida(cod string) bool {
	switch Normalizar(cod) {
	case Medico, Fisioterapeuta, Dentista:
		return true
	default:
		return false
	}
}

// ExigeParaPapel: dono e médico devem ter especialidade cadastrada.
func ExigeParaPapel(papel string) bool {
	switch strings.TrimSpace(strings.ToUpper(papel)) {
	case rbac.PapelMedico, rbac.PapelDono:
		return true
	default:
		return false
	}
}

// ResolverParaUsuario valida e retorna o valor persistido (vazio se o papel não exige).
func ResolverParaUsuario(papel, solicitada string) (string, error) {
	if !ExigeParaPapel(papel) {
		return "", nil
	}
	n := Normalizar(solicitada)
	if !Valida(n) {
		return "", errors.New("especialidade obrigatória: MEDICO, FISIOTERAPEUTA ou DENTISTA")
	}
	return n, nil
}
