package logger

import (
	"log/slog"
	"os"
)

// L é o logger estruturado padrão da aplicação (JSON em produção).
var L *slog.Logger

func init() {
	L = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(L)
}
