/** IDs unificados: corpo (biblioteca) + mãos/pés (SVG MapaMao / MapaPe). */

export type LadoPaciente = "dir" | "esq"

export const SEGMENTOS_MAO = ["pulso", "palma", "dedao", "indicador", "medio", "anelar", "minimo"] as const
export type SegmentoMao = (typeof SEGMENTOS_MAO)[number]

export const SEGMENTOS_PE = [
  "calcanhar",
  "arco",
  "dedao",
  "dedo-2",
  "dedo-3",
  "dedo-4",
  "dedo-mizinho",
] as const
export type SegmentoPe = (typeof SEGMENTOS_PE)[number]

export function idMao(lado: LadoPaciente, seg: SegmentoMao): string {
  return `mao-${lado}-${seg}`
}

export function idPe(lado: LadoPaciente, seg: SegmentoPe): string {
  return `pe-${lado}-${seg}`
}

export const IDS_MAOS_DETALHE: string[] = (["dir", "esq"] as LadoPaciente[]).flatMap((lado) =>
  SEGMENTOS_MAO.map((seg) => idMao(lado, seg))
)

export const IDS_PES_DETALHE: string[] = (["dir", "esq"] as LadoPaciente[]).flatMap((lado) =>
  SEGMENTOS_PE.map((seg) => idPe(lado, seg))
)

const LABEL_MAO: Record<SegmentoMao, string> = {
  pulso: "Pulso",
  palma: "Palma",
  dedao: "Dedão",
  indicador: "Indicador",
  medio: "Médio",
  anelar: "Anelar",
  minimo: "Mínimo",
}

const LABEL_PE: Record<SegmentoPe, string> = {
  calcanhar: "Calcanhar",
  arco: "Arco do pé",
  dedao: "Dedão do pé",
  "dedo-2": "2º dedo",
  "dedo-3": "3º dedo",
  "dedo-4": "4º dedo",
  "dedo-mizinho": "5º dedo (mínimo)",
}

const LADO_MAO: Record<LadoPaciente, string> = { dir: "direita", esq: "esquerda" }
const LADO_PE: Record<LadoPaciente, string> = { dir: "direito", esq: "esquerdo" }

export function labelRegiaoDetalhe(id: string): string {
  const m = /^mao-(dir|esq)-(pulso|palma|dedao|indicador|medio|anelar|minimo)$/.exec(id)
  if (m) {
    const lado = m[1] as LadoPaciente
    const seg = m[2] as SegmentoMao
    return `Mão ${LADO_MAO[lado]} — ${LABEL_MAO[seg]}`
  }
  const p =
    /^pe-(dir|esq)-(calcanhar|arco|dedao|dedo-2|dedo-3|dedo-4|dedo-mizinho)$/.exec(id)
  if (p) {
    const lado = p[1] as LadoPaciente
    const seg = p[2] as SegmentoPe
    return `Pé ${LADO_PE[lado]} — ${LABEL_PE[seg]}`
  }
  return id
}

export function ehRegiaoMaoDetalhe(id: string): boolean {
  return /^mao-(dir|esq)-/.test(id)
}

export function ehRegiaoPeDetalhe(id: string): boolean {
  return /^pe-(dir|esq)-/.test(id)
}

/** Migra IDs do mapa anterior (vista palma/dorso) e mãos inteiras. */
export function migrarMaoPeGrossoParaDetalhe(raw: Record<string, unknown>): Record<string, unknown> {
  const out = { ...raw }

  const grosso: Record<string, string> = {
    "mao-direita": idMao("dir", "pulso"),
    "mao-esquerda": idMao("esq", "pulso"),
    "pe-direito": idPe("dir", "calcanhar"),
    "pe-esquerdo": idPe("esq", "calcanhar"),
  }
  for (const [antigo, novo] of Object.entries(grosso)) {
    if (out[antigo] != null && out[novo] == null) {
      out[novo] = out[antigo]
      delete out[antigo]
    }
  }

  for (const [chave, valor] of Object.entries({ ...out })) {
    const legado = /^mao-(dir|esq)-(palma|dorso)-(punho|pulso|dedao|indicador|medio|anelar|minimo)$/.exec(
      chave
    )
    if (!legado) continue
    const lado = legado[1] as LadoPaciente
    let seg = legado[3] as string
    if (seg === "punho") seg = "pulso"
    const novo = idMao(lado, seg as SegmentoMao)
    if (out[novo] == null) out[novo] = valor
    else if (valor && typeof valor === "object") {
      const a = out[novo] as { ativa?: boolean; descricao?: string }
      const b = valor as { ativa?: boolean; descricao?: string }
      out[novo] = {
        ativa: Boolean(a.ativa) || Boolean(b.ativa),
        descricao: [a.descricao, b.descricao].filter(Boolean).join(" · "),
      }
    }
    delete out[chave]
  }

  for (const [chave, valor] of Object.entries({ ...out })) {
    const legado = /^pe-(dir|esq)-(planta|dorso)-(calcanhar|arco|tendao|dedos)$/.exec(chave)
    if (!legado) continue
    const lado = legado[1] as LadoPaciente
    const segLegado = legado[3]
    const novo =
      segLegado === "arco"
        ? idPe(lado, "arco")
        : segLegado === "tendao"
          ? idPe(lado, "arco")
          : segLegado === "dedos"
            ? idPe(lado, "dedao")
            : idPe(lado, "calcanhar")
    if (out[novo] == null) out[novo] = valor
    delete out[chave]
  }

  return out
}
