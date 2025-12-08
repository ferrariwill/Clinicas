package utils

import (
	"strconv"
	"strings"
)

func NormalizarNome(nome string) string {
	return strings.ToLower(strings.TrimSpace(strings.Join(strings.Fields(nome), " ")))
}

func NormalizarEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func StringParaUint(s string) (uint, error) {
	u64, err := strconv.ParseUint(s, 10, 64)
	return uint(u64), err
}
