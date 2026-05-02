package logger

import (
	"log/slog"
	"os"
	"strings"
)

// L é o logger estruturado padrão da aplicação (JSON em stdout — Logtail, Datadog, etc.).
var L *slog.Logger

func init() {
	level := parseLevelFromEnv()
	L = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	}))
	slog.SetDefault(L)
}

func parseLevelFromEnv() slog.Level {
	switch strings.TrimSpace(strings.ToLower(os.Getenv("LOG_LEVEL"))) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// EmailDomain retorna só o domínio do e-mail para logs (reduz PII no local-part).
func EmailDomain(email string) string {
	s := strings.TrimSpace(strings.ToLower(email))
	i := strings.LastIndex(s, "@")
	if i <= 0 || i >= len(s)-1 {
		return "(invalid)"
	}
	return s[i+1:]
}
