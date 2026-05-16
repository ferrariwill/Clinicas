import type { Muscle } from "react-body-highlighter"
import {
  IDS_MAOS_DETALHE,
  IDS_PES_DETALHE,
  labelRegiaoDetalhe,
  migrarMaoPeGrossoParaDetalhe,
  ehRegiaoMaoDetalhe,
  ehRegiaoPeDetalhe,
} from "@/components/mapa-dor-detalhe-ids"

/** Intensidade assinalada no mapa (0 = sem dor nesta região). */
export type NivelDor = 0 | 1 | 2 | 3

export type MapaDeDorEntrada = {
  ativa: boolean
  descricao: string
  nivel?: 1 | 2 | 3
}

/** Estado unificado de áreas selecionadas (corpo + mãos + pés). */
export type MapaDeDorValor = Record<string, MapaDeDorEntrada>

export const TRADUCAO_PARTE_CORPO: Record<string, string> = {
  head: "Cabeça",
  neck: "Pescoço",
  trapezius: "Trapézio",
  "upper-back": "Costas (superior)",
  "lower-back": "Coluna lombar",
  back: "Costas",
  chest: "Peito",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearm: "Antebraço",
  "back-deltoids": "Ombro (posterior)",
  "front-deltoids": "Ombro (anterior)",
  abs: "Abdômen",
  obliques: "Oblíquos",
  adductor: "Adutor (posterior)",
  abductors: "Abdutores (anterior)",
  hamstring: "Posterior de coxa",
  quadriceps: "Quadríceps",
  calves: "Panturrilha",
  gluteal: "Glúteo",
  knees: "Joelho",
  "left-soleus": "Panturrilha (posterior esq.)",
  "right-soleus": "Panturrilha (posterior dir.)",
}

export const MUSCULOS_ANTERIOR = new Set<Muscle>([
  "head",
  "neck",
  "front-deltoids",
  "chest",
  "biceps",
  "triceps",
  "forearm",
  "abs",
  "obliques",
  "abductors",
  "quadriceps",
  "knees",
  "calves",
])

export const MUSCULOS_POSTERIOR = new Set<Muscle>([
  "head",
  "neck",
  "trapezius",
  "back-deltoids",
  "upper-back",
  "lower-back",
  "triceps",
  "forearm",
  "gluteal",
  "adductor",
  "hamstring",
  "knees",
  "calves",
  "left-soleus",
  "right-soleus",
])

const TODOS_MUSCULOS: Muscle[] = [
  ...new Set<Muscle>([...MUSCULOS_ANTERIOR, ...MUSCULOS_POSTERIOR]),
]

const IDS_CORPO = TODOS_MUSCULOS
const IDS_TODOS = [...IDS_CORPO, ...IDS_MAOS_DETALHE, ...IDS_PES_DETALHE]

export const REGIOES_MAPA_DOR = IDS_TODOS.map((id) => ({
  id,
  label: labelParteCorpo(id),
}))

export function labelParteCorpo(id: string): string {
  if (ehRegiaoMaoDetalhe(id) || ehRegiaoPeDetalhe(id)) return labelRegiaoDetalhe(id)
  return TRADUCAO_PARTE_CORPO[id] ?? id
}

export function nivelDaEntrada(e: MapaDeDorEntrada | undefined): NivelDor {
  if (!e?.ativa) return 0
  if (e.nivel === 1 || e.nivel === 2 || e.nivel === 3) return e.nivel
  return 3
}

export function doresAtivasFromValor(mapa: MapaDeDorValor): string[] {
  return Object.entries(mapa)
    .filter(([, v]) => v?.ativa)
    .map(([id]) => id)
}

export function doresCorpoFromValor(mapa: MapaDeDorValor): string[] {
  return doresAtivasFromValor(mapa).filter(
    (id) => MUSCULOS_ANTERIOR.has(id as Muscle) || MUSCULOS_POSTERIOR.has(id as Muscle)
  )
}

/** Chaves legadas do mapa SVG → slugs atuais. */
const LEGADO_PARA_MUSCULO: Record<string, string> = {
  frente_cabeca: "head",
  costas_cabeca: "head",
  frente_pescoco: "neck",
  costas_pescoco: "neck",
  frente_ombro_direito: "front-deltoids",
  frente_ombro_esquerdo: "front-deltoids",
  costas_ombro_direito: "back-deltoids",
  costas_ombro_esquerdo: "back-deltoids",
  frente_braco_direito: "biceps",
  frente_braco_esquerdo: "biceps",
  costas_braco_direito: "triceps",
  costas_braco_esquerdo: "triceps",
  frente_antebraco_direito: "forearm",
  frente_antebraco_esquerdo: "forearm",
  costas_antebraco_direito: "forearm",
  costas_antebraco_esquerdo: "forearm",
  frente_torax: "chest",
  frente_peito: "chest",
  frente_abdomen: "abs",
  frente_abdome: "abs",
  frente_quadril: "abductors",
  frente_pelve: "abductors",
  frente_coxa_direita: "quadriceps",
  frente_coxa_esquerda: "quadriceps",
  frente_joelho_direito: "knees",
  frente_joelho_esquerdo: "knees",
  frente_panturrilha_direita: "calves",
  frente_panturrilha_esquerda: "calves",
  frente_perna_direita: "calves",
  frente_perna_esquerda: "calves",
  costas_coluna_cervical: "trapezius",
  costas_coluna_toracica: "upper-back",
  costas_coluna_superior: "upper-back",
  costas_torax: "upper-back",
  costas_coluna_lombar: "lower-back",
  costas_lombar: "lower-back",
  costas_quadril: "gluteal",
  costas_sacral: "gluteal",
  costas_coxa_direita: "hamstring",
  costas_coxa_esquerda: "hamstring",
  costas_joelho_direito: "knees",
  costas_joelho_esquerdo: "knees",
  costas_panturrilha_direita: "calves",
  costas_panturrilha_esquerda: "calves",
  costas_perna_direita: "calves",
  costas_perna_esquerda: "calves",
}

export function migrarChavesLegadasMapaDor(raw: Record<string, unknown>): Record<string, unknown> {
  let out: Record<string, unknown> = { ...raw }
  for (const [antigo, novo] of Object.entries(LEGADO_PARA_MUSCULO)) {
    if (out[antigo] != null && out[novo] == null) {
      out[novo] = out[antigo]
      delete out[antigo]
    }
  }
  out = migrarMaoPeGrossoParaDetalhe(out)
  return out
}

function estadoInicial(): MapaDeDorValor {
  const o: MapaDeDorValor = {}
  for (const id of IDS_TODOS) {
    o[id] = { ativa: false, descricao: "" }
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

export function normalizarMapaDeDorValor(
  input: Partial<MapaDeDorValor> | Record<string, unknown> | undefined
): MapaDeDorValor {
  const base = estadoInicial()
  if (!input) return base
  const bruto = migrarChavesLegadasMapaDor(input as Record<string, unknown>)
  for (const id of IDS_TODOS) {
    const v = bruto[id] as MapaDeDorEntrada | undefined
    if (v && typeof v === "object") {
      base[id] = sanitizarEntrada(v)
    }
  }
  return base
}

export function valorFromDores(dores: string[], prev?: MapaDeDorValor): MapaDeDorValor {
  const base = normalizarMapaDeDorValor(prev)
  const set = new Set(dores)
  for (const id of IDS_TODOS) {
    const ativa = set.has(id)
    base[id] = {
      ativa,
      descricao: ativa ? base[id]?.descricao ?? "" : "",
      nivel: ativa ? 3 : undefined,
    }
  }
  return base
}
