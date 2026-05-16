"use client"

import * as React from "react"
import { format, parseISO, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { AgendaResponse, AtestadoMedicoResponse } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/cn"
import { labelEspecialidade } from "@/lib/clinica-especialidade"
import { Calendar, FileSignature } from "lucide-react"

export interface ProntuarioLinhaTempoProps {
  agendas: AgendaResponse[]
  atestados: AtestadoMedicoResponse[]
  isLoading?: boolean
  className?: string
}

/** Data local (America/Sao_Paulo) no formato YYYY-MM-DD para cruzar agenda e atestado. */
function dataKeySaoPaulo(iso: string): string {
  const d = parseISO(iso)
  if (!isValid(d)) return ""
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

function linkCidsToAgendas(
  agendas: AgendaResponse[],
  atestados: AtestadoMedicoResponse[]
): { cidPorAgendaId: Map<string, string>; atestadosSoltos: AtestadoMedicoResponse[] } {
  const cidPorAgendaId = new Map<string, string>()
  const usedAtestadoIds = new Set<string>()
  const agendaSorted = [...agendas].sort(
    (a, b) => parseISO(a.data_horario).getTime() - parseISO(b.data_horario).getTime()
  )
  const atestSorted = [...atestados].sort(
    (a, b) => parseISO(a.criado_em).getTime() - parseISO(b.criado_em).getTime()
  )

  for (const ag of agendaSorted) {
    const dk = dataKeySaoPaulo(ag.data_horario)
    if (!dk) continue
    const uid = (ag.usuario_id ?? "").trim()
    if (!uid) continue
    const match = atestSorted.find(
      (t) =>
        !usedAtestadoIds.has(t.id) &&
        t.profissional_id &&
        String(t.profissional_id) === uid &&
        dataKeySaoPaulo(t.criado_em) === dk &&
        t.cid10 &&
        t.cid10 !== "••••"
    )
    if (match) {
      cidPorAgendaId.set(ag.id, match.cid10)
      usedAtestadoIds.add(match.id)
    }
  }
  const atestadosSoltos = atestados.filter((t) => !usedAtestadoIds.has(t.id))
  return { cidPorAgendaId, atestadosSoltos }
}

type Evento =
  | { key: string; tipo: "agenda"; quando: string; agenda: AgendaResponse; cid10?: string }
  | { key: string; tipo: "atestado"; quando: string; atestado: AtestadoMedicoResponse }

function montarEventos(agendas: AgendaResponse[], atestados: AtestadoMedicoResponse[]): Evento[] {
  const { cidPorAgendaId, atestadosSoltos } = linkCidsToAgendas(agendas, atestados)
  const ev: Evento[] = []
  for (const ag of agendas) {
    ev.push({
      key: `ag-${ag.id}`,
      tipo: "agenda",
      quando: ag.data_horario,
      agenda: ag,
      cid10: cidPorAgendaId.get(ag.id),
    })
  }
  for (const at of atestadosSoltos) {
    ev.push({
      key: `at-${at.id}`,
      tipo: "atestado",
      quando: at.criado_em,
      atestado: at,
    })
  }
  return ev.sort((a, b) => parseISO(b.quando).getTime() - parseISO(a.quando).getTime())
}

function formatarQuando(iso: string): string {
  const d = parseISO(iso)
  if (!isValid(d)) return "—"
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

function BlocoCid({ codigo }: { codigo: string | undefined }) {
  if (!codigo || codigo === "••••") {
    return (
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        CID-10: <span className="font-medium text-slate-600 dark:text-slate-300">não disponível</span>
      </p>
    )
  }
  return (
    <p className="mt-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        CID-10
      </span>
      <span className="ml-2 inline-block rounded-md bg-sky-100 px-2 py-0.5 font-mono text-sm font-bold text-sky-950 dark:bg-sky-900/50 dark:text-sky-100">
        {codigo}
      </span>
    </p>
  )
}

function BlocoEspecialidade({ codigo }: { codigo: string | undefined }) {
  const c = (codigo ?? "").trim().toUpperCase()
  if (!c) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Especialidade: —
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
      {labelEspecialidade(c)}
    </span>
  )
}

export function ProntuarioLinhaTempo({ agendas, atestados, isLoading, className }: ProntuarioLinhaTempoProps) {
  const eventos = React.useMemo(() => montarEventos(agendas, atestados), [agendas, atestados])

  if (isLoading) {
    return (
      <Card className={cn("border-slate-200 dark:border-slate-600", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Linha do tempo de atendimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (eventos.length === 0) {
    return (
      <Card className={cn("border-slate-200 dark:border-slate-600", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900 dark:text-slate-50">Linha do tempo de atendimentos</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Consultas agendadas já realizadas e atestados emitidos aparecem aqui em ordem cronológica.
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum atendimento passado ou atestado registrado para este paciente.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-slate-200 dark:border-slate-600", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-slate-900 dark:text-slate-50">Linha do tempo de atendimentos</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Ordem da mais recente para a mais antiga. O CID-10 é exibido nos atestados e, quando há correspondência no
          mesmo dia e com o mesmo profissional, também na consulta agendada.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="relative ms-3 border-s border-slate-200 pb-1 dark:border-slate-600">
          {eventos.map((ev) => (
            <li key={ev.key} className="relative mb-8 ms-6 last:mb-0">
              <span
                className="absolute -start-[21px] top-1.5 flex h-3.5 w-3.5 rounded-full border border-white bg-sky-500 ring-2 ring-white dark:border-slate-900 dark:bg-sky-400 dark:ring-slate-900"
                aria-hidden
              />
              {ev.tipo === "agenda" ? (
                <article className="rounded-xl border border-slate-100 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <Calendar className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                      <h3 className="text-sm font-semibold">Consulta agendada</h3>
                    </div>
                    <time className="text-xs text-slate-500 dark:text-slate-400">{formatarQuando(ev.quando)}</time>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {(ev.agenda.procedimento_nomes ?? (ev.agenda.procedimento_nome ? [ev.agenda.procedimento_nome] : []))
                      .filter(Boolean)
                      .join(" · ") || "Procedimento não informado"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Profissional:{" "}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {ev.agenda.usuario_nome ?? "—"}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <BlocoEspecialidade codigo={ev.agenda.usuario_especialidade} />
                    {ev.agenda.status ? (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {ev.agenda.status}
                      </span>
                    ) : null}
                  </div>
                  <BlocoCid codigo={ev.cid10} />
                </article>
              ) : (
                <article className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/25">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-950 dark:text-amber-100">
                      <FileSignature className="h-4 w-4 shrink-0" />
                      <h3 className="text-sm font-semibold">Atestado médico</h3>
                    </div>
                    <time className="text-xs text-amber-800/90 dark:text-amber-200/90">{formatarQuando(ev.quando)}</time>
                  </div>
                  <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/90">
                    {ev.atestado.tipo === "HORAS" ? "Afastamento em horas" : "Afastamento em dias"} · Quantidade:{" "}
                    {ev.atestado.quantidade}
                  </p>
                  <p className="mt-1 text-xs text-amber-950 dark:text-amber-100">
                    Profissional:{" "}
                    <span className="font-medium">{ev.atestado.profissional?.nome ?? "—"}</span>
                  </p>
                  <div className="mt-2">
                    <BlocoEspecialidade codigo={ev.atestado.profissional?.especialidade} />
                  </div>
                  <BlocoCid codigo={ev.atestado.cid10} />
                </article>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
