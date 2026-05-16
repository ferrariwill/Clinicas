import { codigoCIDCanonico } from "@/lib/cid10/cid10-utils"

const STORAGE_PREFIX = "clinicas_cid10_recentes_"
const MAX_ITENS = 20

function chave(usuarioId: string): string {
  return `${STORAGE_PREFIX}${usuarioId}`
}

export function carregarCid10Recentes(usuarioId: string | undefined | null): string[] {
  if (!usuarioId || typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(chave(usuarioId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === "string").map((c) => c.trim().toUpperCase()).filter(Boolean)
  } catch {
    return []
  }
}

/** Grava código usado manualmente (fora da lista) no histórico recente do profissional. */
export function registrarCid10ManualRecente(usuarioId: string | undefined | null, codigoNormalizado: string): void {
  if (!usuarioId || typeof window === "undefined") return
  const c = (codigoNormalizado ?? "").trim().toUpperCase()
  if (!c) return
  const prev = carregarCid10Recentes(usuarioId).filter((x) => codigoCIDCanonico(x) !== codigoCIDCanonico(c))
  const next = [c, ...prev].slice(0, MAX_ITENS)
  try {
    window.localStorage.setItem(chave(usuarioId), JSON.stringify(next))
  } catch {
    /* quota / privado */
  }
}
