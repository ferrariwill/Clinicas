package utils

import "strings"

func NormalizarNome(nome string) string {
	return strings.ToLower(strings.TrimSpace(strings.Join(strings.Fields(nome), " ")))
}
