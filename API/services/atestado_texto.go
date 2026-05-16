package services

import (
	"fmt"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/especialidade"
)

const atestadoTipoHoras = "HORAS"
const atestadoTipoDias = "DIAS"

// MontarTextoAtestadoPT gera o corpo do atestado em português (padrão usual no Brasil).
// Mantenha alinhado com FRONT/src/lib/atestado-brasil.ts quando alterar redação.
func MontarTextoAtestadoPT(
	pacienteNome, pacienteCPF string,
	tipo string,
	quantidade uint,
	cid10 string,
	profNome, espProfissional string,
	dataRef time.Time,
	consultaHoraInicio, consultaHoraFim string,
) string {
	nomePac := strings.TrimSpace(pacienteNome)
	if nomePac == "" {
		nomePac = "o(a) paciente"
	}
	cpf := strings.TrimSpace(pacienteCPF)
	cpf = strings.ReplaceAll(cpf, ".", "")
	cpf = strings.ReplaceAll(cpf, "-", "")

	unidade := "dia(s)"
	if strings.EqualFold(strings.TrimSpace(tipo), atestadoTipoHoras) {
		unidade = "hora(s)"
	}
	q := quantidade
	if q == 0 {
		q = 1
	}

	cargo := cargoPorEspecialidade(espProfissional)
	cid := strings.TrimSpace(strings.ToUpper(cid10))

	var linhasCPF string
	if cpf != "" {
		linhasCPF = fmt.Sprintf("portador(a) do CPF nº %s, ", formatarCPFExibicao(cpf))
	}

	dataStr := dataRef.Format("02/01/2006")

	var b strings.Builder
	b.WriteString("ATESTADO\n\n")
	b.WriteString(fmt.Sprintf(
		"Atesto, para os devidos fins, que %s, %snecessita permanecer afastado(a) de suas atividades habituais por %d %s, por motivo de saúde, em razão de quadro clínico codificado em CID-10: %s.\n\n",
		nomePac,
		linhasCPF,
		q,
		unidade,
		cid,
	))
	ci := strings.TrimSpace(consultaHoraInicio)
	cf := strings.TrimSpace(consultaHoraFim)
	if ci != "" && cf != "" {
		b.WriteString(fmt.Sprintf(
			"Atesto ainda que, nesta mesma data, o(a) paciente esteve em consulta médica no período das %s às %s.\n\n",
			ci,
			cf,
		))
	}
	b.WriteString("O(A) paciente deverá apresentar este documento quando solicitado.\n\n")
	b.WriteString(fmt.Sprintf("Data da emissão: %s.\n\n", dataStr))
	b.WriteString(strings.Repeat("_", 48))
	b.WriteString("\n")
	b.WriteString(strings.TrimSpace(profNome))
	b.WriteString("\n")
	b.WriteString(cargo)
	b.WriteString("\n")
	b.WriteString("Documento do conselho regional (CRM / CREFITO / CRO): ___________________________\n\n")
	b.WriteString("Espaço reservado para carimbo:\n\n")
	b.WriteString(strings.Repeat("_", 48))
	b.WriteString("\n")
	return b.String()
}

func cargoPorEspecialidade(esp string) string {
	switch especialidade.Normalizar(esp) {
	case especialidade.Fisioterapeuta:
		return "Fisioterapeuta"
	case especialidade.Dentista:
		return "Cirurgião(ã)-Dentista"
	default:
		return "Médico(a)"
	}
}

func formatarCPFExibicao(digits string) string {
	d := onlyDigits(digits)
	if len(d) != 11 {
		return digits
	}
	return fmt.Sprintf("%s.%s.%s-%s", d[0:3], d[3:6], d[6:9], d[9:11])
}

func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
