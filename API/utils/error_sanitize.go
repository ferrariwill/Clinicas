package utils

import (
	"strings"
)

// SafeErrorMessage evita exposição de detalhes de banco/tabelas para o cliente.
func SafeErrorMessage(err error, fallback string) string {
	if err == nil {
		return fallback
	}
	msg := strings.TrimSpace(err.Error())
	low := strings.ToLower(msg)
	dbHints := []string{
		"sqlstate",
		"pq:",
		"table",
		"column",
		"constraint",
		"relation",
		"duplicate key",
		"syntax error",
		"database",
	}
	for _, h := range dbHints {
		if strings.Contains(low, h) {
			return fallback
		}
	}
	return msg
}
