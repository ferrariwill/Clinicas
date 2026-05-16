import { codigoCIDCanonico } from "@/lib/cid10/cid10-utils"

export type ItemCID10 = { codigo: string; descricao: string }

/**
 * Lista curada de CID-10 (códigos frequentes) para busca assistida.
 * Códigos fora da lista ainda podem ser usados manualmente após confirmação, se o formato for válido.
 */
export const LISTA_CID10: ItemCID10[] = [
  { codigo: "A09", descricao: "Diarreia e gastroenterite de origem infecciosa presumível" },
  { codigo: "A15", descricao: "Tuberculose respiratória, com confirmação bacteriológica e histológica" },
  { codigo: "B34.9", descricao: "Infecção viral não especificada" },
  { codigo: "E11", descricao: "Diabetes mellitus tipo 2" },
  { codigo: "E11.9", descricao: "Diabetes mellitus tipo 2 sem complicações" },
  { codigo: "E78.5", descricao: "Hiperlipidemia não especificada" },
  { codigo: "F32.9", descricao: "Episódio depressivo não especificado" },
  { codigo: "F41.9", descricao: "Transtorno de ansiedade não especificado" },
  { codigo: "G43.9", descricao: "Enxaqueca não especificada" },
  { codigo: "G44.2", descricao: "Cefaleia tensional" },
  { codigo: "H10.9", descricao: "Conjuntivite não especificada" },
  { codigo: "I10", descricao: "Hipertensão essencial (primária)" },
  { codigo: "I11.9", descricao: "Doença cardíaca hipertensiva sem insuficiência cardíaca" },
  { codigo: "I20.9", descricao: "Angina pectoris não especificada" },
  { codigo: "I21.9", descricao: "Infarto agudo do miocárdio não especificado" },
  { codigo: "I50.9", descricao: "Insuficiência cardíaca não especificada" },
  { codigo: "J00", descricao: "Rinofaringite aguda [resfriado comum]" },
  { codigo: "J02.9", descricao: "Faringite aguda não especificada" },
  { codigo: "J03.9", descricao: "Amigdalite aguda não especificada" },
  { codigo: "J04.0", descricao: "Laringite aguda" },
  { codigo: "J06.9", descricao: "Infecção aguda das vias aéreas superiores não especificada" },
  { codigo: "J11.1", descricao: "Influenza com outras manifestações respiratórias" },
  { codigo: "J18.9", descricao: "Pneumonia não especificada" },
  { codigo: "J20.9", descricao: "Bronquite aguda não especificada" },
  { codigo: "J30.4", descricao: "Rinite alérgica não especificada" },
  { codigo: "J45.9", descricao: "Asma não especificada" },
  { codigo: "K21.9", descricao: "Doença do refluxo gastroesofágico sem esofagite" },
  { codigo: "K29.7", descricao: "Gastrite não especificada" },
  { codigo: "K59.0", descricao: "Constipação" },
  { codigo: "K59.1", descricao: "Diarréia funcional" },
  { codigo: "L20.9", descricao: "Dermatite atópica não especificada" },
  { codigo: "L30.9", descricao: "Dermatite não especificada" },
  { codigo: "M25.50", descricao: "Dor articular não especificada" },
  { codigo: "M54.5", descricao: "Dor lombar baixa" },
  { codigo: "M54.9", descricao: "Dorsalgia não especificada" },
  { codigo: "M79.1", descricao: "Mialgia" },
  { codigo: "N39.0", descricao: "Infecção do trato urinário não especificada" },
  { codigo: "N93.9", descricao: "Hemorragia uterina anormal não especificada" },
  { codigo: "O80", descricao: "Parto único espontâneo" },
  { codigo: "O82", descricao: "Parto único por cesariana" },
  { codigo: "R05", descricao: "Tosse" },
  { codigo: "R06.0", descricao: "Dispneia" },
  { codigo: "R07.4", descricao: "Dor no peito não especificada" },
  { codigo: "R10.4", descricao: "Outras dores abdominais e as não especificadas" },
  { codigo: "R11", descricao: "Náusea e vômito" },
  { codigo: "R50.9", descricao: "Febre não especificada" },
  { codigo: "R51", descricao: "Cefaleia" },
  { codigo: "R53", descricao: "Mal-estar e fadiga" },
  { codigo: "R63.4", descricao: "Perda de peso anormal" },
  { codigo: "S93.4", descricao: "Entorse e distensão do tornozelo" },
  { codigo: "T14.9", descricao: "Traumatismo não especificado" },
  { codigo: "Z00.0", descricao: "Exame médico geral" },
  { codigo: "Z01.7", descricao: "Exame laboratorial em pessoas sem queixa" },
  { codigo: "Z02.7", descricao: "Exame médico para emissão de atestado" },
  { codigo: "Z03.9", descricao: "Observação por suspeita de doença não confirmada" },
  { codigo: "Z76.3", descricao: "Pessoa sadia acompanhando doente" },
  { codigo: "K02.9", descricao: "Cárie dentária não especificada" },
  { codigo: "K04.7", descricao: "Pericementite apical sem abscesso" },
  { codigo: "K05.3", descricao: "Doença periodontal crônica" },
  { codigo: "K08.1", descricao: "Perda de dentes por acidente, extração ou periodontose" },
  { codigo: "K12.1", descricao: "Outras formas de estomatite" },
  { codigo: "S02.5", descricao: "Fratura do maxilar" },
  { codigo: "M26.69", descricao: "Outras anomalias dentofaciais" },
  { codigo: "R07.0", descricao: "Dor de garganta" },
  { codigo: "H91.9", descricao: "Perda de audição não especificada" },
  { codigo: "J39.3", descricao: "Edema de supraglote" },
  { codigo: "D50.9", descricao: "Anemia por deficiência de ferro não especificada" },
  { codigo: "D64.9", descricao: "Anemia não especificada" },
  { codigo: "E03.9", descricao: "Hipotireoidismo não especificado" },
  { codigo: "E66.9", descricao: "Obesidade não especificada" },
  { codigo: "F10.9", descricao: "Transtornos mentais e comportamentais devidos ao uso de álcool" },
  { codigo: "G40.9", descricao: "Epilepsia não especificada" },
  { codigo: "I63.9", descricao: "Infarto cerebral não especificado" },
  { codigo: "J44.9", descricao: "Doença pulmonar obstrutiva crônica não especificada" },
  { codigo: "K25.9", descricao: "Úlcera gástrica não especificada" },
  { codigo: "K26.9", descricao: "Úlcera duodenal não especificada" },
  { codigo: "K80.20", descricao: "Cálculo da vesícula biliar sem colecistite" },
  { codigo: "L50.9", descricao: "Urticária não especificada" },
  { codigo: "M17.9", descricao: "Gonartrose não especificada" },
  { codigo: "M19.90", descricao: "Artrose não especificada" },
  { codigo: "N18.9", descricao: "Doença renal crônica não especificada" },
  { codigo: "R42", descricao: "Tontura e instabilidade" },
  { codigo: "R55", descricao: "Síncope e colapso" },
  { codigo: "S06.0", descricao: "Concussão" },
  { codigo: "S83.5", descricao: "Entorse e distensão do joelho" },
  { codigo: "Z23.8", descricao: "Vacinação não especificada" },
  { codigo: "Z71.9", descricao: "Pessoa em consulta não especificada" },
]

export function codigoExisteNaLista(codigo: string): boolean {
  const canon = codigoCIDCanonico(codigo)
  if (!canon) return false
  return LISTA_CID10.some((it) => codigoCIDCanonico(it.codigo) === canon)
}

export function buscarNaListaCID10(query: string, limite = 50): ItemCID10[] {
  const q = (query ?? "").trim().toLowerCase()
  if (!q) return []
  const qCanon = codigoCIDCanonico(q)
  const out: ItemCID10[] = []
  for (const it of LISTA_CID10) {
    const c = codigoCIDCanonico(it.codigo)
    if (c.startsWith(qCanon) || it.descricao.toLowerCase().includes(q)) {
      out.push(it)
      if (out.length >= limite) break
    }
  }
  return out
}

export function resolverItemListaPorCodigo(codigo: string): ItemCID10 | undefined {
  const canon = codigoCIDCanonico(codigo)
  return LISTA_CID10.find((it) => codigoCIDCanonico(it.codigo) === canon)
}
