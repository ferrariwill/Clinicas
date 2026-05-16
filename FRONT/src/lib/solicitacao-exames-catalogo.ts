/** Itens sugeridos para solicitação de exames, agrupados por especialidade cadastrada na clínica. */
export type CodigoEspecialidadeExames = "MEDICO" | "FISIOTERAPEUTA" | "DENTISTA"

export interface ItemExameSugerido {
  id: string
  nome: string
}

export const EXAMES_POR_ESPECIALIDADE: Record<CodigoEspecialidadeExames, ItemExameSugerido[]> = {
  MEDICO: [
    { id: "hemograma", nome: "Hemograma completo" },
    { id: "glicemia_jejum", nome: "Glicemia em jejum" },
    { id: "hba1c", nome: "Hemoglobina glicada (HbA1c)" },
    { id: "creatinina", nome: "Creatinina / ureia" },
    { id: "tgo_tgp", nome: "Transaminases (TGO/TGP)" },
    { id: "tsh_t4", nome: "TSH e T4 livre" },
    { id: "urina_i", nome: "Urina tipo I" },
    { id: "eas", nome: "EAS (urina com elementos anormais)" },
    { id: "pcr", nome: "PCR (proteína C reativa)" },
    { id: "lipidograma", nome: "Lipidograma" },
    { id: "rx_torax", nome: "Raio-X de tórax (PA e perfil)" },
    { id: "ecg", nome: "Eletrocardiograma (ECG)" },
    { id: "vitamina_d", nome: "Vitamina D (25-OH)" },
    { id: "ferro_ferritina", nome: "Ferro sérico e ferritina" },
  ],
  FISIOTERAPEUTA: [
    { id: "rx_coluna", nome: "Raio-X de coluna (cervical / torácica / lombar conforme região)" },
    { id: "rx_articular", nome: "Raio-X simples de articulação (joelho / ombro / punho)" },
    { id: "usg_moles", nome: "USG de partes moles / músculo-tendíneo" },
    { id: "rm_articular", nome: "Ressonância magnética de articulação" },
    { id: "densitometria", nome: "Densitometria óssea" },
    { id: "emg", nome: "Eletromiografia (EMG)" },
    { id: "tc_coluna", nome: "Tomografia de coluna (se indicado)" },
    { id: "laboratorio_inflamacao", nome: "Painel inflamatório (VHS/PCR)" },
  ],
  DENTISTA: [
    { id: "rx_periapical", nome: "Radiografia periapical" },
    { id: "rx_interproximal", nome: "Radiografia interproximal (bite-wing)" },
    { id: "rx_panoramica", nome: "Radiografia panorâmica" },
    { id: "telerradio_perfil", nome: "Telerradiografia em perfil" },
    { id: "cbct", nome: "Tomografia cone beam (CBCT)" },
    { id: "rx_oclusal", nome: "Radiografia oclusal" },
    { id: "modelos", nome: "Modelos ortodônticos (gesso ou digital)" },
    { id: "fotos_intra", nome: "Documentação fotográfica intraoral" },
  ],
}

/** Escolhe o catálogo mais adequado ao código de especialidade do profissional. */
export function catalogoExamesParaEspecialidade(cod: string | undefined | null): ItemExameSugerido[] {
  const c = (cod ?? "").trim().toUpperCase()
  if (c === "DENTISTA") return EXAMES_POR_ESPECIALIDADE.DENTISTA
  if (c === "FISIOTERAPEUTA") return EXAMES_POR_ESPECIALIDADE.FISIOTERAPEUTA
  return EXAMES_POR_ESPECIALIDADE.MEDICO
}

export function labelContextoExames(cod: string | undefined | null): string {
  const c = (cod ?? "").trim().toUpperCase()
  if (c === "DENTISTA") return "Odontologia — exames de imagem frequentes"
  if (c === "FISIOTERAPEUTA") return "Fisioterapia — exames de apoio diagnóstico"
  return "Clínica médica — laboratório e imagem frequentes"
}
