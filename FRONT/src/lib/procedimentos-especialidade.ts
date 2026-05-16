/** Códigos alinhados à API (`internal/especialidade`) e ao cadastro de usuários. */
export type CodigoEspecialidadeProcedimento = "" | "MEDICO" | "FISIOTERAPEUTA" | "DENTISTA"

export const OPCOES_ESPECIALIDADE_PROCEDIMENTO: { value: CodigoEspecialidadeProcedimento; label: string }[] = [
  { value: "", label: "Todas as especialidades" },
  { value: "MEDICO", label: "Médico(a)" },
  { value: "FISIOTERAPEUTA", label: "Fisioterapeuta" },
  { value: "DENTISTA", label: "Odontologia" },
]

export function rotuloEspecialidadeProcedimento(codigo?: string | null): string {
  const c = (codigo ?? "").trim().toUpperCase() as CodigoEspecialidadeProcedimento
  const hit = OPCOES_ESPECIALIDADE_PROCEDIMENTO.find((o) => o.value === c)
  return hit?.label ?? "Todas as especialidades"
}
