/** Apenas dígitos */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "")
}

/** Duração em minutos (até 999) para campos de tempo de atendimento */
export function maskMinutosConsulta(value: string): string {
  return digitsOnly(value).slice(0, 3)
}

/** CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** CNPJ: 00.000.000/0001-00 */
export function maskCNPJ(value: string): string {
  const d = digitsOnly(value).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** Documento BR (CPF ou CNPJ) em máscara dinâmica */
export function maskDocumentoBR(value: string): string {
  const d = digitsOnly(value).slice(0, 14)
  if (d.length <= 11) return maskCPF(d)
  return maskCNPJ(d)
}

/** Telefone BR: (00) 0000-0000 ou (00) 00000-0000 */
export function maskPhoneBR(value: string): string {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Data visual dd/MM/aaaa a partir de dígitos */
export function maskDataBR(value: string): string {
  const d = digitsOnly(value).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** Converte dd/MM/yyyy completo para yyyy-MM-dd (API) */
export function dataBRToISO(br: string): string | null {
  const m = br.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const dt = new Date(yyyy, mm - 1, dd)
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null
  return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
}

/** yyyy-MM-dd -> dd/MM/yyyy */
export function dataISOToBR(iso: string): string {
  const m = iso?.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ""
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Moeda BRL no campo (ex.: 1.234,56) */
export function maskMoedaBRL(value: string): string {
  const d = digitsOnly(value)
  if (d.length === 0) return ""
  const n = Number(d) / 100
  if (!Number.isFinite(n)) return ""
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Interpreta string mascarada pt-BR para número */
export function parseMoedaBRL(s: string): number {
  const t = s.replace(/\./g, "").replace(",", ".")
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : NaN
}

/** CPF para exibição em listas (LGPD): mantém formato parcial, oculta início e dígitos verificadores. */
export function maskCPFForDisplayLGPD(cpfRaw: string | undefined | null): string {
  const d = digitsOnly(String(cpfRaw ?? ""))
  if (d.length !== 11) return d.length > 0 ? "***.***.***-**" : "—"
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
}

/** Telefone para exibição: formata em padrão BR a partir dos dígitos. */
export function formatTelefoneDisplay(telRaw: string | undefined | null): string {
  const d = digitsOnly(String(telRaw ?? ""))
  if (d.length < 10) return telRaw?.trim() ? maskPhoneBR(d) : "—"
  return maskPhoneBR(d)
}
