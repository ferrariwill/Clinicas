"use client"

import * as React from "react"
import { cn } from "@/lib/utils/cn"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapaDeDorCorpoPane } from "@/components/mapa-dor-corpo-pane"
import { MapaDeDorMaosPane } from "@/components/mapa-dor-maos-pane"
import { MapaDeDorPesPane } from "@/components/mapa-dor-pes-pane"
import {
  doresAtivasFromValor,
  doresCorpoFromValor,
  labelParteCorpo,
  normalizarMapaDeDorValor,
  REGIOES_MAPA_DOR,
  type MapaDeDorValor,
} from "@/components/mapa-de-dor-model"

export type { MapaDeDorValor as SelectedAreas }

type AbaMapa = "corpo" | "maos" | "pes"

const ABAS: { id: AbaMapa; label: string }[] = [
  { id: "corpo", label: "Corpo inteiro" },
  { id: "maos", label: "Mãos" },
  { id: "pes", label: "Pés" },
]

export interface MapaDeDorProps {
  value?: MapaDeDorValor
  onChange?: (next: MapaDeDorValor) => void
  className?: string
  titulo?: string
  readOnly?: boolean
}

function ListaDoresChips({ ids }: { ids: string[] }) {
  if (ids.length === 0) {
    return <p className="mt-1.5 text-xs text-slate-500">Nenhuma região marcada.</p>
  }
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-live="polite">
      {ids.map((id) => (
        <li
          key={id}
          className="max-w-full rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-medium leading-tight text-red-900"
        >
          {labelParteCorpo(id)}
        </li>
      ))}
    </ul>
  )
}

/**
 * Mapa de dor com abas: corpo (biblioteca), mãos e pés (SVG detalhado).
 * Todas as marcações compartilham o mesmo estado (MapaDeDorValor / selectedAreas).
 */
export function MapaDeDor({
  value,
  onChange,
  className,
  titulo = "Mapa de dor",
  readOnly = false,
}: MapaDeDorProps) {
  const [interno, setInterno] = React.useState<MapaDeDorValor>(() => normalizarMapaDeDorValor(undefined))
  const [aba, setAba] = React.useState<AbaMapa>("corpo")

  const controlado = value !== undefined && typeof onChange === "function"
  const selectedAreas = controlado ? normalizarMapaDeDorValor(value) : normalizarMapaDeDorValor(interno)
  const doresAtivas = React.useMemo(() => doresAtivasFromValor(selectedAreas), [selectedAreas])
  const doresCorpo = React.useMemo(() => doresCorpoFromValor(selectedAreas), [selectedAreas])

  const emitir = React.useCallback(
    (next: MapaDeDorValor) => {
      if (controlado) onChange!(next)
      else setInterno(next)
    },
    [controlado, onChange]
  )

  const alternarParte = React.useCallback(
    (id: string) => {
      if (readOnly) return
      const cur = selectedAreas[id]
      const ativa = !cur?.ativa
      emitir({
        ...selectedAreas,
        [id]: {
          ativa,
          descricao: ativa ? cur?.descricao ?? "" : "",
          nivel: ativa ? 3 : undefined,
        },
      })
    },
    [selectedAreas, emitir, readOnly]
  )

  const setDescricao = React.useCallback(
    (id: string, descricao: string) => {
      if (readOnly) return
      const cur = selectedAreas[id] ?? { ativa: false, descricao: "" }
      emitir({ ...selectedAreas, [id]: { ...cur, descricao } })
    },
    [selectedAreas, emitir, readOnly]
  )

  const regioesAtivas = REGIOES_MAPA_DOR.filter((r) => selectedAreas[r.id]?.ativa)

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-1 text-xs text-slate-600">
        {readOnly
          ? "Registro salvo no prontuário."
          : "Use as abas para marcar o corpo, cada dedo das mãos e regiões dos pés. Tudo é salvo junto na evolução."}
      </p>

      <div
        className="mt-4 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1"
        role="tablist"
        aria-label="Seções do mapa de dor"
      >
        {ABAS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
              aba === id
                ? "bg-white text-sky-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            )}
            onClick={() => setAba(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-[280px]" role="tabpanel">
        {aba === "corpo" && (
          <MapaDeDorCorpoPane
            estado={selectedAreas}
            doresCorpo={doresCorpo}
            readOnly={readOnly}
            onToggle={alternarParte}
          />
        )}
        {aba === "maos" && (
          <MapaDeDorMaosPane estado={selectedAreas} readOnly={readOnly} onToggle={alternarParte} />
        )}
        {aba === "pes" && (
          <MapaDeDorPesPane estado={selectedAreas} readOnly={readOnly} onToggle={alternarParte} />
        )}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5">
        <p className="text-xs font-semibold text-slate-800">
          {readOnly ? "Dores assinaladas" : "Áreas selecionadas"} ({doresAtivas.length})
        </p>
        <ListaDoresChips ids={doresAtivas} />
      </div>

      <div className="mt-4 min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <p className="text-xs font-medium text-slate-700">Observações por região marcada</p>
        {regioesAtivas.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhuma região com dor assinalada.</p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-4 overflow-y-auto pr-1">
            {regioesAtivas.map((r) => (
              <li key={r.id}>
                <Label htmlFor={`mapa-dor-desc-${r.id}`} className="text-slate-800">
                  {r.label}
                </Label>
                <Input
                  id={`mapa-dor-desc-${r.id}`}
                  className="mt-1.5"
                  placeholder="Ex.: queimação, irradiação, EVA…"
                  value={selectedAreas[r.id]?.descricao ?? ""}
                  onChange={(e) => setDescricao(r.id, e.target.value)}
                  disabled={readOnly}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        Modelo ilustrativo para registro clínico; não substitui exame físico detalhado.
      </p>
    </div>
  )
}
