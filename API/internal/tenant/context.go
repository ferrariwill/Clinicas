package tenant

import (
	"context"
)

type ctxKey struct{}

// Info contém dados do tenant e do usuário autenticado propagados no contexto da requisição.
type Info struct {
	ClinicaID     uint
	UsuarioID     uint
	TipoUsuarioID uint
	Papel         string
}

func WithInfo(parent context.Context, info Info) context.Context {
	return context.WithValue(parent, ctxKey{}, info)
}

func FromContext(ctx context.Context) (Info, bool) {
	v, ok := ctx.Value(ctxKey{}).(Info)
	return v, ok
}
