"use client"

import { useMemo } from "react"
import { useMedicoDashboardClinico } from "@/hooks/use-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type MedicoResumoClinicoDashboardProps = {
  clinicaId?: string
  semanas?: number
  /** Menos texto auxiliar quando embutido no dashboard operacional. */
  compact?: boolean
}

export function MedicoResumoClinicoDashboard({
  clinicaId,
  semanas = 12,
  compact = false,
}: MedicoResumoClinicoDashboardProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useMedicoDashboardClinico({
    semanas,
    clinicaId,
    enabled: true,
  })

  const maxCid = useMemo(() => {
    const list = data?.cid_mais_comuns ?? []
    return list.reduce((m, x) => Math.max(m, x.total), 0) || 1
  }, [data?.cid_mais_comuns])

  const maxVol = useMemo(() => {
    const list = data?.volume_por_semana ?? []
    return list.reduce((m, x) => Math.max(m, x.total), 0) || 1
  }, [data?.volume_por_semana])

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Não foi possível carregar o resumo clínico.</p>
            <p className="mt-1 text-rose-800 dark:text-rose-200">
              {error instanceof Error ? error.message : "Verifique sua conexão ou tente novamente."}
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const cids = data?.cid_mais_comuns ?? []
  const vol = data?.volume_por_semana ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!compact && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Últimas {data?.semanas ?? semanas} semanas — seus registros de prontuário e atestados nesta clínica.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex items-center gap-2"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">CID-10 mais frequentes</CardTitle>
            {!compact && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Atestados emitidos por você + menções válidas de CID em texto de prontuário (no máximo um por código por
                registro).
              </p>
            )}
          </CardHeader>
          <CardContent>
            {cids.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ainda não há CID-10 suficiente no período. Emita atestados com CID ou registre evoluções que citam o
                código.
              </p>
            ) : (
              <ul className="space-y-3">
                {cids.map((row) => (
                  <li key={row.cid} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                      {row.cid}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-sky-600 dark:bg-sky-500"
                          style={{ width: `${Math.min(100, (row.total / maxCid) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300">
                      {row.total}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Volume por semana</CardTitle>
            {!compact && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Barras: prontuário (azul) e atestados (âmbar). Altura = total de documentos na semana.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {vol.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Sem dados no período.</p>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="flex min-h-[200px] items-end gap-1.5 pt-4" style={{ minWidth: `${vol.length * 28}px` }}>
                  {vol.map((w) => {
                    const h = w.total === 0 ? 4 : Math.max(8, (w.total / maxVol) * 160)
                    const pctPront = w.total === 0 ? 0 : (w.prontuarios / w.total) * 100
                    return (
                      <div key={`${w.ano}-${w.semana}`} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full max-w-[32px] rounded-t-md border border-slate-200/80 shadow-sm dark:border-slate-600"
                          style={{
                            height: `${h}px`,
                            background: `linear-gradient(to top, rgb(2 132 199) 0%, rgb(2 132 199) ${pctPront}%, rgb(217 119 6) ${pctPront}%, rgb(217 119 6) 100%)`,
                          }}
                          title={`${w.rotulo}: ${w.total} (pront.: ${w.prontuarios}, atest.: ${w.atestados})`}
                        />
                        <span className="max-w-[48px] truncate text-center text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                          {w.rotulo}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-sm bg-sky-600" /> Prontuário
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-sm bg-amber-600" /> Atestado
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
