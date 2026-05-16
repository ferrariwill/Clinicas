/** Códigos persistidos na API (usuários DONO / MEDICO). */
export type EspecialidadeClinicaCodigo = "MEDICO" | "FISIOTERAPEUTA" | "DENTISTA"

export const ESPECIALIDADES_CLINICA: { value: EspecialidadeClinicaCodigo; label: string }[] = [
  { value: "MEDICO", label: "Médico" },
  { value: "FISIOTERAPEUTA", label: "Fisioterapeuta" },
  { value: "DENTISTA", label: "Dentista" },
]

export function tipoPapelExigeEspecialidade(papel: string | undefined | null): boolean {
  const p = (papel ?? "").trim().toUpperCase()
  return p === "MEDICO" || p === "DONO"
}

export function labelEspecialidade(cod: string | undefined | null): string {
  const c = (cod ?? "").trim().toUpperCase()
  const hit = ESPECIALIDADES_CLINICA.find((x) => x.value === c)
  return hit?.label ?? "—"
}

/** Textos da tela de atendimentos conforme a especialidade do profissional logado. */
export function textosAtendimentoPorEspecialidade(cod: string | undefined | null) {
  const c = (cod ?? "").trim().toUpperCase()
  if (c === "FISIOTERAPEUTA") {
    return {
      iniciar: "Iniciar sessão",
      finalizar: "Finalizar sessão",
      prontuario: "Abrir prontuário",
      hint: "Fluxo de fisioterapia: evolução e conduta no prontuário.",
    }
  }
  if (c === "DENTISTA") {
    return {
      iniciar: "Iniciar atendimento",
      finalizar: "Finalizar atendimento",
      prontuario: "Abrir prontuário (odontologia)",
      hint: "Fluxo odontológico: registre procedimentos e evolução no prontuário.",
    }
  }
  return {
    iniciar: "Iniciar consulta",
    finalizar: "Finalizar consulta",
    prontuario: "Abrir prontuário",
    hint: "Veja os agendamentos do dia e abra o prontuário do paciente para registrar evolução, queixas e conduta.",
  }
}
