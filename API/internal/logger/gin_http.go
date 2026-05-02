package logger

import (
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const ginKeyRequestID = "request_id"

// RequestIDFromGin lê o request_id definido pelo middleware de acesso.
func RequestIDFromGin(c *gin.Context) string {
	if v, ok := c.Get(ginKeyRequestID); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// GinMiddlewareAccessLog registra cada requisição HTTP concluída (JSON, uma linha por request).
func GinMiddlewareAccessLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		rid := strings.TrimSpace(c.Request.Header.Get("X-Request-ID"))
		if rid == "" {
			rid = uuid.New().String()
		}
		c.Writer.Header().Set("X-Request-ID", rid)
		c.Set(ginKeyRequestID, rid)

		c.Next()

		ms := time.Since(start).Milliseconds()
		level := slog.LevelInfo
		st := c.Writer.Status()
		if st >= 500 {
			level = slog.LevelError
		} else if st >= 400 {
			level = slog.LevelWarn
		}

		L.Log(c.Request.Context(), level, "http_request",
			slog.String("tipo", "http"),
			slog.String("request_id", rid),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Int("status", st),
			slog.Int64("duration_ms", ms),
			slog.String("client_ip", c.ClientIP()),
		)
	}
}

// GinMiddlewareRecovery captura panics e registra em JSON sem derrubar o processo.
func GinMiddlewareRecovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		L.Error("panic_recovered",
			slog.String("tipo", "panic"),
			slog.String("request_id", RequestIDFromGin(c)),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Any("recover", recovered),
		)
		c.AbortWithStatusJSON(500, gin.H{"error": "Erro interno do servidor"})
	})
}
