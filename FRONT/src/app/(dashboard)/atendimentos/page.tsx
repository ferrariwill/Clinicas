"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/hooks/use-auth"
import { useAgendaDia, usePacientes, useProfissionais, useAtualizarStatusAgenda } from "@/hooks/use-agenda"
import type { AgendaResponse, PacienteResponse } from "@/types/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { FileText, RefreshCw, Stethoscope, Play, CheckCircle2 } from "lucide-react"

function horaAgenda(dataHorario: string) {
  try {
    return format(parseISO(dataHorario), "HH:mm", { locale: ptBR })
  } catch {
    return "—"
  }
}

export default function AtendimentosPage() {
  const { usuario, hasPermission } = useAuth()
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [profissionalFiltro, setProfissionalFiltro] = useState("")

  const dateString = format(selectedDay, "yyyy-MM-dd")
  const isMedico = usuario?.tipo_usuario === "MEDICO"
  const isDono = usuario?.tipo_usuario === "DONO" || usuario?.tipo_usuario === "DONO_CLINICA"
  const isSecretaria = usuario?.tipo_usuario === "SECRETARIA"
  const podeVer = hasPermission(["MEDICO", "DONO", "DONO_CLINICA", "SECRETARIA"])
  const podeFiltrarTodosProfissionais = isDono || isSecretaria

  const usuarioQueryId =
    isMedico && usuario?.id ? usuario.id : profissionalFiltro || undefined

  const agendaQuery = useAgendaDia(dateString, usuarioQueryId)
  const atualizarStatus = useAtualizarStatusAgenda()
  const { data: pacientes = [] } = usePacientes()
  const { data: profissionais = [] } = useProfissionais()

  const pacienteNome = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pacientes as PacienteResponse[]) {
      m.set(String(p.id), p.nome)
    }
    return m
  }, [pacientes])

  const agendamentosDia = useMemo(() => {
    const raw = (agendaQuery.data ?? []) as AgendaResponse[]
    return raw.filter((a) => {
      try {
        const d = parseISO(a.data_horario)
        if (!isValid(d)) return false
        return format(d, "yyyy-MM-dd") === dateString
      } catch {
        return false
      }
    })
  }, [agendaQuery.data, dateString])

  if (!usuario) return null

  if (!podeVer) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900">
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-2 text-amber-800">Esta área é voltada a médicos, dono e secretaria da clínica.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-sky-600" />
            Meus atendimentos
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Veja os agendamentos do dia e abra o prontuário do paciente para registrar evolução, queixas e conduta.
          </p>
        </div>
        {podeFiltrarTodosProfissionais && (
          <div className="min-w-[220px]">
            <label className="block text-sm font-medium text-slate-700">Profissional</label>
            <select
              value={profissionalFiltro}
              onChange={(e) => setProfissionalFiltro(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Todos (clínica)</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,360px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dia do atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar selected={selectedDay} onSelect={(d) => d && setSelectedDay(d)} />
            <p className="mt-3 text-center text-sm text-slate-600">
              {format(selectedDay, "EEEE, dd/MM/yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Agenda do dia</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => agendaQuery.refetch()}
              disabled={agendaQuery.isPending}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            {agendaQuery.isPending && (
              <div className="space-y-3">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
            )}
            {!agendaQuery.isPending && agendamentosDia.length === 0 && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                Nenhum agendamento nesta data
                {isMedico ? " para o seu perfil" : ""}.
              </p>
            )}
            {!agendaQuery.isPending && agendamentosDia.length > 0 && (
              <ul className="space-y-3">
                {agendamentosDia.map((a) => {
                  const nome = pacienteNome.get(String(a.paciente_id)) || `Paciente #${a.paciente_id}`
                  return (
                    <li
                      key={a.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{nome}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {horaAgenda(a.data_horario)} · Status: {a.status}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {["AGENDADO", "CONFIRMADO"].includes((a.status || "").toUpperCase()) && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={atualizarStatus.isPending}
                            onClick={() =>
                              atualizarStatus.mutate({ agendaId: a.id, statusId: "Em atendimento" })
                            }
                            className="gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Iniciar consulta
                          </Button>
                        )}
                        {(a.status || "").toUpperCase() === "EM ATENDIMENTO" && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={atualizarStatus.isPending}
                            onClick={() =>
                              atualizarStatus.mutate({ agendaId: a.id, statusId: "Realizado" })
                            }
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Finalizar consulta
                          </Button>
                        )}
                        <Link
                          href={`/pacientes/${a.paciente_id}/prontuario`}
                          className={cn(
                            "inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                          )}
                        >
                          <FileText className="h-4 w-4" />
                          Abrir prontuário
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
