/**
 * Notação FDI permanente — dentes decíduos não entram neste mapa de 32 dentes adultos.
 */
export const NUMEROS_FDI_ORDEM = [
  "18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28",
  "48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38",
] as const

export type NumeroFDI = (typeof NUMEROS_FDI_ORDEM)[number]

export type EstadoDenteOdonto = "saudavel" | "carie" | "canal" | "extraido"

export type OdontogramaDentes = Record<string, EstadoDenteOdonto>

export const ODONTOGRAMA_TITULO = "ODONTOGRAMA"

type PayloadV1 = {
  tipo: "odontograma_v1"
  dentes: OdontogramaDentes
}

export function criarOdontogramaInicial(): OdontogramaDentes {
  const o: OdontogramaDentes = {}
  for (const n of NUMEROS_FDI_ORDEM) {
    o[n] = "saudavel"
  }
  return o
}

export function serializarOdontograma(dentes: OdontogramaDentes): string {
  const payload: PayloadV1 = { tipo: "odontograma_v1", dentes: { ...dentes } }
  return JSON.stringify(payload)
}

export function deserializarOdontograma(conteudo: string): OdontogramaDentes | null {
  const raw = conteudo?.trim()
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<PayloadV1>
    if (p?.tipo !== "odontograma_v1" || !p.dentes || typeof p.dentes !== "object") return null
    const out = criarOdontogramaInicial()
    for (const n of NUMEROS_FDI_ORDEM) {
      const v = p.dentes[n]
      if (v === "saudavel" || v === "carie" || v === "canal" || v === "extraido") {
        out[n] = v
      }
    }
    return out
  } catch {
    return null
  }
}

export function isTituloOdontograma(titulo: string): boolean {
  return titulo.trim().toUpperCase() === ODONTOGRAMA_TITULO
}
