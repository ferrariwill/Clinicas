"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { computeTelasLiberadas, useMinhasPermissoesRotas } from "@/hooks/use-minhas-permissoes-rotas"
import { MedicoResumoClinicoDashboard } from "@/components/medico-resumo-clinico-dashboard"
import { ClinicaSelector } from "@/components/clinica-selector"

const PAPAIS_RESUMO = new Set(["MEDICO", "DONO", "DONO_CLINICA"])

export default function MeuResumoClinicoPage() {
  const router = useRouter()
  const { usuario, clinicaId, userRole } = useAuth()
  const { data: permRotas, isSuccess: permissoesOk } = useMinhasPermissoesRotas()
  const [selectedClinicaId, setSelectedClinicaId] = useState<string | undefined>(clinicaId ?? undefined)

  const podeVer = useMemo(() => PAPAIS_RESUMO.has((userRole ?? "").trim().toUpperCase()), [userRole])

  useEffect(() => {
    if (!selectedClinicaId && clinicaId) {
      setSelectedClinicaId(clinicaId)
    }
  }, [clinicaId, selectedClinicaId])

  useEffect(() => {
    if (!permissoesOk) return
    if (!podeVer) {
      router.replace("/agenda")
    }
  }, [permissoesOk, podeVer, router])

  const { podeAgenda, podePacientes } = useMemo(
    () => computeTelasLiberadas(permissoesOk ? permRotas : undefined, userRole),
    [permRotas, userRole, permissoesOk]
  )

  if (!permissoesOk) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Carregando permissões…</p>
  }

  if (!podeVer) {
    return null
  }

  if (!podeAgenda && !podePacientes) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="font-medium">Sem acesso à agenda ou pacientes neste perfil.</p>
        <p className="mt-2 text-sm">Peça ao administrador da clínica para liberar ao menos uma dessas telas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Meu resumo clínico</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Olá, {usuario?.nome?.split(/\s+/)[0] ?? "profissional"} — visão dos seus prontuários e atestados na clínica
            ativa.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <ClinicaSelector onClinicaChange={(id) => setSelectedClinicaId(id)} />
        </div>
      </div>

      <MedicoResumoClinicoDashboard clinicaId={selectedClinicaId} semanas={12} />
    </div>
  )
}
