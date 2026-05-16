/**
 * Texto do atestado em português (Brasil).
 * Manter alinhado com API/services/atestado_texto.go (MontarTextoAtestadoPT).
 */

export type TipoAfastamento = "HORAS" | "DIAS"

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "")
}

function formatarCPFExibicao(digits: string): string {
  const d = onlyDigits(digits)
  if (d.length !== 11) return digits.trim()
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
}

function cargoPorEspecialidade(esp: string): string {
  const e = (esp ?? "").trim().toUpperCase()
  if (e === "FISIOTERAPEUTA") return "Fisioterapeuta"
  if (e === "DENTISTA") return "Cirurgião(ã)-Dentista"
  return "Médico(a)"
}

/** Formato 24h HH:MM (ex.: 08:30). */
export function horarioConsultaValido24h(h: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test((h ?? "").trim())
}

export function gerarTextoAtestadoBr(opts: {
  pacienteNome: string
  pacienteCPF?: string
  tipo: TipoAfastamento
  quantidade: number
  cid10: string
  profissionalNome: string
  especialidadeProfissional: string
  dataRef?: Date
  /** Opcional: período em que o paciente esteve em consulta (ambos preenchidos ou nenhum). */
  consultaHoraInicio?: string
  consultaHoraFim?: string
}): string {
  let nomePac = (opts.pacienteNome ?? "").trim()
  if (!nomePac) nomePac = "o(a) paciente"

  const cpfRaw = onlyDigits(opts.pacienteCPF ?? "")
  const cpfFmt = cpfRaw ? formatarCPFExibicao(cpfRaw) : ""
  const linhasCPF = cpfFmt ? `portador(a) do CPF nº ${cpfFmt}, ` : ""

  const unidade = opts.tipo === "HORAS" ? "hora(s)" : "dia(s)"
  const q = Math.max(1, Math.min(999, Math.floor(opts.quantidade) || 1))
  const cid = (opts.cid10 ?? "").trim().toUpperCase()
  const cargo = cargoPorEspecialidade(opts.especialidadeProfissional)
  const dataStr = formatDataPt(opts.dataRef ?? new Date())

  const profNome = (opts.profissionalNome ?? "").trim()

  const ci = (opts.consultaHoraInicio ?? "").trim()
  const cf = (opts.consultaHoraFim ?? "").trim()

  const bloco: string[] = []
  bloco.push("ATESTADO", "")
  bloco.push(
    `Atesto, para os devidos fins, que ${nomePac}, ${linhasCPF}necessita permanecer afastado(a) de suas atividades habituais por ${q} ${unidade}, por motivo de saúde, em razão de quadro clínico codificado em CID-10: ${cid}.`,
    ""
  )
  if (ci && cf) {
    bloco.push(
      `Atesto ainda que, nesta mesma data, o(a) paciente esteve em consulta médica no período das ${ci} às ${cf}.`,
      ""
    )
  }
  bloco.push(
    "O(A) paciente deverá apresentar este documento quando solicitado.",
    "",
    `Data da emissão: ${dataStr}.`,
    "",
    "_".repeat(48),
    profNome,
    cargo,
    "Documento do conselho regional (CRM / CREFITO / CRO): ___________________________",
    "",
    "Espaço reservado para carimbo:",
    "",
    "_".repeat(48)
  )
  return bloco.join("\n")
}

function formatDataPt(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export { cid10Preenchido, cid10ValidoParaUso } from "@/lib/cid10/cid10-utils"
