import type { MapaDeDorEntrada, MapaDeDorValor } from "@/components/mapa-de-dor-model"
import { normalizarMapaDeDorValor, REGIOES_MAPA_DOR } from "@/components/mapa-de-dor-model"

export const MAPA_DE_DOR_TITULO = "MAPA_DE_DOR"

type PayloadV1 = {
  tipo: "mapa_dor_v1"
  regioes: MapaDeDorValor
}

export function criarMapaDeDorInicial(): MapaDeDorValor {
  const o: MapaDeDorValor = {}
  for (const r of REGIOES_MAPA_DOR) {
    o[r.id] = { ativa: false, descricao: "" }
  }
  return o
}

function sanitizarEntrada(v: MapaDeDorEntrada): MapaDeDorEntrada {
  const ativa = Boolean(v.ativa)
  let nivel = v.nivel
  if (ativa && nivel !== 1 && nivel !== 2 && nivel !== 3) nivel = 3
  if (!ativa) nivel = undefined
  return {
    ativa,
    descricao: typeof v.descricao === "string" ? v.descricao : "",
    nivel,
  }
}

export function serializarMapaDeDor(regioes: MapaDeDorValor): string {
  const base = criarMapaDeDorInicial()
  const merged: MapaDeDorValor = { ...base, ...normalizarMapaDeDorValor(regioes) }
  for (const r of REGIOES_MAPA_DOR) {
    const v = merged[r.id]
    if (v) {
      merged[r.id] = sanitizarEntrada(v)
    }
  }
  const payload: PayloadV1 = { tipo: "mapa_dor_v1", regioes: merged }
  return JSON.stringify(payload)
}

export function deserializarMapaDeDor(conteudo: string): MapaDeDorValor | null {
  const raw = conteudo?.trim()
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<PayloadV1>
    if (p?.tipo !== "mapa_dor_v1" || !p.regioes || typeof p.regioes !== "object") return null
    return normalizarMapaDeDorValor(p.regioes as Record<string, unknown>)
  } catch {
    return null
  }
}

export function isTituloMapaDeDor(titulo: string): boolean {
  return titulo.trim().toUpperCase() === MAPA_DE_DOR_TITULO
}
