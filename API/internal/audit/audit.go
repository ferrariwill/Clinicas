package audit

import (
	"context"
	"log/slog"

	"github.com/ferrariwill/Clinicas/API/internal/logger"
	"github.com/ferrariwill/Clinicas/API/internal/tenant"
)

const (
	AcaoProntuarioCriar     = "PRONTUARIO_CRIAR"
	AcaoProntuarioAtualizar = "PRONTUARIO_ATUALIZAR"
	AcaoProntuarioLer       = "PRONTUARIO_LER"
	AcaoFinanceiroAcesso    = "FINANCEIRO_ACESSO"
	AcaoAgendamentoCriar    = "AGENDAMENTO_CRIAR"
)

// Log registra evento de auditoria (LGPD / trilha de acesso a dados sensíveis).
// Nunca inclua conteúdo clínico integral em attrs — apenas identificadores.
func Log(ctx context.Context, acao, recurso string, recursoID uint, attrs ...slog.Attr) {
	info, ok := tenant.FromContext(ctx)
	if !ok {
		logger.L.LogAttrs(ctx, slog.LevelInfo, "auditoria",
			append([]slog.Attr{
				slog.String("tipo", "auditoria"),
				slog.String("acao", acao),
				slog.String("recurso", recurso),
				slog.Uint64("recurso_id", uint64(recursoID)),
			}, attrs...)...,
		)
		return
	}
	base := []slog.Attr{
		slog.String("tipo", "auditoria"),
		slog.String("acao", acao),
		slog.String("recurso", recurso),
		slog.Uint64("recurso_id", uint64(recursoID)),
		slog.Uint64("clinica_id", uint64(info.ClinicaID)),
		slog.Uint64("usuario_id", uint64(info.UsuarioID)),
		slog.String("papel", info.Papel),
	}
	base = append(base, attrs...)
	logger.L.LogAttrs(ctx, slog.LevelInfo, "auditoria", base...)
}
