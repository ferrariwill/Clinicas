package utils

import (
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"
)

var saoPauloLocation = sync.OnceValue(func() *time.Location {
	l, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		// Não usar time.Local do host: servidor em UTC/EUA deslocaria a grade (−3 h vs Brasília).
		return time.FixedZone("BRT", -3*3600)
	}
	return l
})

// LocSaoPaulo retorna o fuso de Brasília para datas/horários de agenda (evita UTC no servidor = −3 h na grade).
func LocSaoPaulo() *time.Location {
	return saoPauloLocation()
}

func NormalizarNome(nome string) string {
	return strings.ToLower(strings.TrimSpace(strings.Join(strings.Fields(nome), " ")))
}

func NormalizarEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// NormalizarCPF mantém só dígitos (11 posições esperadas após validação no controller).
func NormalizarCPF(cpf string) string {
	var b strings.Builder
	for _, r := range cpf {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func MaskCPF(cpf string) string {
	d := NormalizarCPF(cpf)
	if len(d) != 11 {
		return "***.***.***-**"
	}
	return "***." + d[3:6] + ".***-" + d[9:11]
}

func MaskTelefoneBR(tel string) string {
	d := NormalizarCPF(tel)
	if len(d) < 8 {
		return "***"
	}
	if len(d) == 10 {
		return "(**) ****-" + d[6:10]
	}
	if len(d) >= 11 {
		return "(**) *****-" + d[len(d)-4:]
	}
	return "***"
}

func StringParaUint(s string) (uint, error) {
	if s == "" {
		return 0, nil
	}
	u64, err := strconv.ParseUint(s, 10, 64)
	return uint(u64), err
}

// ParseAgendaDataHora interpreta data/hora enviada pelo front (RFC3339 ou ISO sem fuso → fuso local do servidor).
func ParseAgendaDataHora(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, fmt.Errorf("data/hora vazia")
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		return t, nil
	}
	layouts := []string{
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04",
		"2006-01-02 15:04",
	}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, s, LocSaoPaulo()); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("data/hora inválida: use ISO 2006-01-02T15:04:05 ou RFC3339 com fuso (ex.: 2006-01-02T15:04:00-03:00)")
}
