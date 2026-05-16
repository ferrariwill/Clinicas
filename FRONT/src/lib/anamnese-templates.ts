/**
 * Modelos de Anamnese (história médica) por especialidade — persistidos no prontuário como JSON.
 */

export type EspecialidadeAnamneseModelo = "MEDICO" | "FISIOTERAPEUTA" | "DENTISTA"

export type CampoAnamnese = {
  id: string
  label: string
  placeholder?: string
  /** Linhas aproximadas do textarea */
  rows?: number
}

export type SecaoAnamnese = {
  titulo: string
  descricao?: string
  campos: CampoAnamnese[]
}

export const ANAMNESE_TITULO = "ANAMNESE"

type PayloadV1 = {
  tipo: "anamnese_v1"
  especialidade: EspecialidadeAnamneseModelo
  respostas: Record<string, string>
}

export const ANAMNESE_SECOES: Record<EspecialidadeAnamneseModelo, SecaoAnamnese[]> = {
  MEDICO: [
    {
      titulo: "Queixa e história da doença atual",
      descricao: "Foco na queixa principal e evolução dos sintomas.",
      campos: [
        {
          id: "queixa_principal",
          label: "Queixa principal",
          placeholder: "Motivo da consulta, início, duração, características da dor ou sintoma principal…",
          rows: 5,
        },
        {
          id: "doencas_anteriores",
          label: "Doenças e cirurgias anteriores",
          placeholder: "Internações, diagnósticos prévios, cirurgias, alergias medicamentosas relevantes…",
          rows: 5,
        },
        {
          id: "historico_familiar",
          label: "Histórico familiar",
          placeholder: "Doenças hereditárias ou familiares relevantes (cardiovasculares, diabetes, câncer, etc.)…",
          rows: 4,
        },
      ],
    },
  ],
  FISIOTERAPEUTA: [
    {
      titulo: "Avaliação funcional e dor",
      descricao: "Postura, movimentos que desencadeiam dor e histórico de lesões.",
      campos: [
        {
          id: "avaliacao_postura",
          label: "Postura e alinhamento",
          placeholder: "Observações de postura estática e dinâmica, compensações, assimetrias…",
          rows: 4,
        },
        {
          id: "movimentos_dor",
          label: "Movimentos ou atividades que causam ou pioram a dor",
          placeholder: "Ex.: flexão do tronco, subir escadas, permanecer sentado, esforço laboral…",
          rows: 5,
        },
        {
          id: "historico_lesoes",
          label: "Histórico de lesões e tratamentos",
          placeholder: "Traumas, entorses, fraturas, fisioterapias anteriores, imagens ou exames relevantes…",
          rows: 5,
        },
      ],
    },
  ],
  DENTISTA: [
    {
      titulo: "Hábitos e histórico bucal",
      descricao: "Higiene, sensibilidade e tratamentos odontológicos prévios.",
      campos: [
        {
          id: "habitos_higiene",
          label: "Hábitos de higiene oral",
          placeholder: "Escovação, fio dental, enxaguante, frequência, uso de escova elétrica…",
          rows: 4,
        },
        {
          id: "sensibilidade",
          label: "Sensibilidade ou sintomas",
          placeholder: "Dor ao frio/calor/doce, sangramento gengival, mau hálito, bruxismo…",
          rows: 4,
        },
        {
          id: "tratamentos_anteriores",
          label: "Tratamentos odontológicos anteriores",
          placeholder: "Restaurações, extrações, canal, próteses, clareamento, última consulta…",
          rows: 4,
        },
      ],
    },
  ],
}

export function modeloAnamnesePorEspecialidade(
  especialidadeUsuario: string | undefined | null
): EspecialidadeAnamneseModelo {
  const e = (especialidadeUsuario ?? "").trim().toUpperCase()
  if (e === "DENTISTA") return "DENTISTA"
  if (e === "FISIOTERAPEUTA") return "FISIOTERAPEUTA"
  return "MEDICO"
}

export function criarAnamneseInicial(esp: EspecialidadeAnamneseModelo): Record<string, string> {
  const out: Record<string, string> = {}
  for (const sec of ANAMNESE_SECOES[esp]) {
    for (const c of sec.campos) {
      out[c.id] = ""
    }
  }
  return out
}

export function serializarAnamnese(esp: EspecialidadeAnamneseModelo, respostas: Record<string, string>): string {
  const base = criarAnamneseInicial(esp)
  const merged = { ...base, ...respostas }
  for (const k of Object.keys(merged)) {
    merged[k] = typeof merged[k] === "string" ? merged[k] : ""
  }
  const payload: PayloadV1 = { tipo: "anamnese_v1", especialidade: esp, respostas: merged }
  return JSON.stringify(payload)
}

export type AnamneseDeserializada = {
  especialidade: EspecialidadeAnamneseModelo
  respostas: Record<string, string>
}

export function deserializarAnamnese(conteudo: string): AnamneseDeserializada | null {
  const raw = conteudo?.trim()
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<PayloadV1>
    if (p?.tipo !== "anamnese_v1" || !p.respostas || typeof p.respostas !== "object") return null
    const esp: EspecialidadeAnamneseModelo =
      p.especialidade === "DENTISTA" || p.especialidade === "FISIOTERAPEUTA" || p.especialidade === "MEDICO"
        ? p.especialidade
        : "MEDICO"
    const base = criarAnamneseInicial(esp)
    const respostas = { ...base }
    for (const k of Object.keys(p.respostas)) {
      if (k in respostas && typeof (p.respostas as Record<string, unknown>)[k] === "string") {
        respostas[k] = (p.respostas as Record<string, string>)[k]
      }
    }
    return { especialidade: esp, respostas }
  } catch {
    return null
  }
}

export function isTituloAnamnese(titulo: string): boolean {
  return titulo.trim().toUpperCase() === ANAMNESE_TITULO
}
