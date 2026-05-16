import type { MapaDeDorValor } from "@/components/mapa-de-dor-model"
import { REGIOES_MAPA_DOR } from "@/components/mapa-de-dor-model"
import { deserializarMapaDeDor, serializarMapaDeDor } from "@/lib/mapa-dor-serial"

/** Conteúdo persistido em `conteudo` quando a evolução inclui mapa de dor. */
export const PRONTUARIO_TEXTO_MAPA_TIPO = "prontuario_texto_mapa_v1" as const

export function temRegiaoDorAtiva(mapa: MapaDeDorValor): boolean {
  return REGIOES_MAPA_DOR.some((r) => mapa[r.id]?.ativa)
}

/** Lista ordenada pelas regiões do mapa (labels legíveis). */
export function listarLabelsRegioesComDor(mapa: MapaDeDorValor): string[] {
  return REGIOES_MAPA_DOR.filter((r) => mapa[r.id]?.ativa).map((r) => r.label)
}

/** Frase inserida/atualizada no início do campo de evolução. */
export function montarFraseRegioesComDor(mapa: MapaDeDorValor): string {
  const ls = listarLabelsRegioesComDor(mapa)
  if (ls.length === 0) return ""
  return `Regiões com queixa de dor: ${ls.join(", ")}.`
}

/** Remove o parágrafo automático gerado a partir do mapa (para reescrever ao mudar marcações). */
export function removerFraseAutomaticaDoTexto(texto: string): string {
  return texto
    .replace(/^\s*Regiões com queixa de dor:\s*[^\r\n]+\.?\s*(\r?\n\s*)?/i, "")
    .trimStart()
}

/** Reaplica a frase conforme o mapa; preserva o texto livre abaixo. */
export function sincronizarDescricaoComMapa(descricaoAtual: string, mapa: MapaDeDorValor): string {
  const corpo = removerFraseAutomaticaDoTexto(descricaoAtual).trimEnd()
  const frase = montarFraseRegioesComDor(mapa)
  if (!frase) return corpo
  return corpo ? `${frase}\n\n${corpo}` : frase
}

export type ConteudoEvolucaoParse =
  | { kind: "plain"; texto: string }
  | { kind: "com_mapa"; texto: string; mapa: MapaDeDorValor }

/** Interpreta `conteudo` salvo (texto simples ou envelope JSON com mapa). */
export function parseConteudoEvolucao(raw: string): ConteudoEvolucaoParse {
  const t = (raw ?? "").trim()
  if (!t.startsWith("{")) return { kind: "plain", texto: raw ?? "" }
  try {
    const o = JSON.parse(t) as { tipo?: string; texto_evolucao?: string; mapa_dor?: unknown }
    if (o?.tipo !== PRONTUARIO_TEXTO_MAPA_TIPO) return { kind: "plain", texto: raw ?? "" }
    const texto = typeof o.texto_evolucao === "string" ? o.texto_evolucao : ""
    if (!o.mapa_dor || typeof o.mapa_dor !== "object") {
      return { kind: "plain", texto: texto || (raw ?? "") }
    }
    const mapa = deserializarMapaDeDor(JSON.stringify(o.mapa_dor))
    if (!mapa) return { kind: "plain", texto: texto || (raw ?? "") }
    return { kind: "com_mapa", texto, mapa }
  } catch {
    return { kind: "plain", texto: raw ?? "" }
  }
}

/** Serializa texto da evolução + estado do mapa para um único `conteudo` na API. */
export function serializarEvolucaoComMapa(textoEvolucao: string, mapa: MapaDeDorValor): string {
  const inner = JSON.parse(serializarMapaDeDor(mapa)) as { tipo: string; regioes: MapaDeDorValor }
  return JSON.stringify({
    tipo: PRONTUARIO_TEXTO_MAPA_TIPO,
    texto_evolucao: textoEvolucao.trim(),
    mapa_dor: inner,
  })
}
