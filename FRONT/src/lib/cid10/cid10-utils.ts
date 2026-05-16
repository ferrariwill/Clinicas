/**
 * Validação e normalização básicas de CID-10 (formato WHO usual: letra + 2 dígitos + subcódigo opcional).
 */

/** Remove pontos e deixa em maiúsculas para comparação. */
export function codigoCIDCanonico(codigo: string): string {
  return (codigo ?? "").toUpperCase().replace(/\./g, "").trim()
}

/**
 * Formato aceito: uma letra (A-Z), dois dígitos, opcionalmente ponto e 1–4 dígitos (ex.: J06, J06.9, A09).
 */
export function validarFormatoCid10(codigo: string): boolean {
  const c = (codigo ?? "").trim().toUpperCase()
  return /^[A-Z]\d{2}(\.\d{1,4})?$/.test(c)
}

/** Normaliza para exibição/armazenamento: maiúsculas; ponto só após 3º caractere se houver subcódigo. */
export function normalizarCid10(codigo: string): string {
  const raw = (codigo ?? "").trim().toUpperCase()
  if (!raw) return ""
  const canon = codigoCIDCanonico(raw)
  if (canon.length <= 3) return canon.slice(0, 1) + canon.slice(1, 3)
  return `${canon.slice(0, 3)}.${canon.slice(3)}`
}

/**
 * Restringe a digitação a letra + dígitos; insere o ponto após o 3º caractere quando há subcódigo (ex.: J069 → J06.9).
 */
export function filtrarDigitacaoCid10(valor: string): string {
  const u = (valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!u.length) return ""
  const letter = u[0]
  if (!/[A-Z]/.test(letter)) return ""
  const digits = u
    .slice(1)
    .replace(/\D/g, "")
    .slice(0, 6)
  if (digits.length <= 2) return letter + digits
  return `${letter}${digits.slice(0, 2)}.${digits.slice(2)}`
}

const BUSCA_CID10_MAX = 120

/**
 * Entrada do campo de busca CID-10: permite digitar código (letra + dígitos) **ou** texto para filtrar por descrição.
 * O filtro estrito {@link filtrarDigitacaoCid10} impedia qualquer letra após a primeira, quebrando a busca por nome.
 */
export function filtrarEntradaBuscaCid10(valor: string): string {
  const raw = (valor ?? "").replace(/[^\p{L}\p{N}\s.\-]/gu, "").replace(/\s+/g, " ")
  return raw.slice(0, BUSCA_CID10_MAX)
}

export function cid10Preenchido(cid: string): boolean {
  return (cid ?? "").trim().length > 0
}

/** Pronto para salvar/imprimir: não vazio e formato válido. */
export function cid10ValidoParaUso(cid: string): boolean {
  const t = (cid ?? "").trim()
  if (!t) return false
  return validarFormatoCid10(normalizarCid10(t))
}
