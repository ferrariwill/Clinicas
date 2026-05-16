"use client"

import * as React from "react"
import { cn } from "@/lib/utils/cn"
import { Label } from "@/components/ui/label"
import {
  ANAMNESE_SECOES,
  type EspecialidadeAnamneseModelo,
  criarAnamneseInicial,
} from "@/lib/anamnese-templates"

export interface AnamneseFormProps {
  especialidade: EspecialidadeAnamneseModelo
  value?: Record<string, string>
  onChange?: (next: Record<string, string>) => void
  readOnly?: boolean
  className?: string
}

const TITULO_MODELO: Record<EspecialidadeAnamneseModelo, string> = {
  MEDICO: "Anamnese — modelo médico",
  FISIOTERAPEUTA: "Anamnese — modelo fisioterapia",
  DENTISTA: "Anamnese — modelo odontologia",
}

/**
 * Formulário estruturado de anamnese conforme o modelo da especialidade (Médico, Fisioterapeuta ou Dentista).
 */
export function AnamneseForm({
  especialidade,
  value,
  onChange,
  readOnly = false,
  className,
}: AnamneseFormProps) {
  const [interno, setInterno] = React.useState(() => criarAnamneseInicial(especialidade))
  const controlado = value !== undefined && (readOnly || typeof onChange === "function")
  const respostas = controlado ? { ...criarAnamneseInicial(especialidade), ...value } : interno

  React.useEffect(() => {
    if (controlado) return
    setInterno(criarAnamneseInicial(especialidade))
  }, [especialidade, controlado])

  const setCampo = (id: string, texto: string) => {
    if (readOnly) return
    const next = { ...respostas, [id]: texto }
    if (controlado && onChange) onChange(next)
    else setInterno(next)
  }

  const secoes = ANAMNESE_SECOES[especialidade]

  return (
    <div className={cn("space-y-8", className)}>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{TITULO_MODELO[especialidade]}</h3>
        <p className="mt-1 text-xs text-slate-600">
          {readOnly
            ? "Registro salvo no prontuário."
            : "Preencha os campos abaixo. Os dados serão armazenados no histórico do paciente."}
        </p>
      </div>

      {secoes.map((sec) => (
        <section key={sec.titulo} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-900/30">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{sec.titulo}</h4>
          {sec.descricao && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{sec.descricao}</p>}
          <div className="mt-4 space-y-4">
            {sec.campos.map((campo) => (
              <div key={campo.id} className="space-y-1.5">
                <Label htmlFor={`anamnese-${especialidade}-${campo.id}`} className="text-slate-800 dark:text-slate-200">
                  {campo.label}
                </Label>
                <textarea
                  id={`anamnese-${especialidade}-${campo.id}`}
                  rows={campo.rows ?? 4}
                  disabled={readOnly}
                  placeholder={campo.placeholder}
                  value={respostas[campo.id] ?? ""}
                  onChange={(e) => setCampo(campo.id, e.target.value)}
                  className={cn(
                    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
                    readOnly && "cursor-default opacity-95"
                  )}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
