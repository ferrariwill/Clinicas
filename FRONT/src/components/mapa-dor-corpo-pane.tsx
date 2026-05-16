"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import type { IExerciseData, IMuscleStats, Muscle } from "react-body-highlighter"
import { ModelType } from "react-body-highlighter"
import { cn } from "@/lib/utils/cn"
import {
  MAPA_DOR_COR_CORPO,
  MAPA_DOR_COR_DOR,
} from "@/components/mapa-dor-region-path"
import { MUSCULOS_ANTERIOR, MUSCULOS_POSTERIOR } from "@/components/mapa-de-dor-model"

const BodyModel = dynamic(() => import("react-body-highlighter"), { ssr: false })

function buildHighlightData(muscles: Muscle[]): IExerciseData[] {
  if (!muscles.length) return []
  return [{ name: "Dor", muscles, frequency: 1 }]
}

function musclesNaVista(vista: "anterior" | "posterior", dores: string[]): Muscle[] {
  const pool = vista === "anterior" ? MUSCULOS_ANTERIOR : MUSCULOS_POSTERIOR
  return dores.filter((m): m is Muscle => pool.has(m as Muscle))
}

export function MapaDeDorCorpoPane({
  doresCorpo,
  readOnly,
  onToggle,
}: {
  doresCorpo: string[]
  readOnly: boolean
  onToggle: (id: string) => void
}) {
  const [vistaMobile, setVistaMobile] = React.useState<"ambas" | "frente" | "costas">("ambas")

  const makeClick =
    (vista: "anterior" | "posterior") =>
    ({ muscle }: IMuscleStats) => {
      const pool = vista === "anterior" ? MUSCULOS_ANTERIOR : MUSCULOS_POSTERIOR
      if (!pool.has(muscle)) return
      onToggle(muscle)
    }

  const dataFrente = buildHighlightData(musclesNaVista("anterior", doresCorpo))
  const dataCostas = buildHighlightData(musclesNaVista("posterior", doresCorpo))

  const modelProps = {
    bodyColor: MAPA_DOR_COR_CORPO,
    highlightedColors: [MAPA_DOR_COR_DOR],
    svgStyle: { maxHeight: "min(60vh, 400px)" } as React.CSSProperties,
    style: { width: "100%", maxWidth: "220px", margin: "0 auto" } as React.CSSProperties,
  }

  const mostrarFrente = vistaMobile === "ambas" || vistaMobile === "frente"
  const mostrarCostas = vistaMobile === "ambas" || vistaMobile === "costas"

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        Tronco e membros (ombros, coluna, joelhos, etc.). Para dedos, use as abas Mãos e Pés.
      </p>

      <div className="flex flex-wrap gap-2 lg:hidden">
        {(["ambas", "frente", "costas"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              vistaMobile === v
                ? "border-sky-600 bg-sky-50 text-sky-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
            onClick={() => setVistaMobile(v)}
          >
            {v === "ambas" ? "Frente e costas" : v === "frente" ? "Só frente" : "Só costas"}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "grid gap-6",
          vistaMobile === "ambas" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        )}
      >
        {mostrarFrente && (
          <figure className="flex flex-col items-center gap-2">
            <figcaption className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Frente
            </figcaption>
            <div className="mapa-dor-rbh w-full max-w-[240px]">
              <BodyModel
                {...modelProps}
                type={ModelType.ANTERIOR}
                data={dataFrente}
                onClick={readOnly ? undefined : makeClick("anterior")}
              />
            </div>
          </figure>
        )}
        {mostrarCostas && (
          <figure className="flex flex-col items-center gap-2">
            <figcaption className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Costas
            </figcaption>
            <div className="mapa-dor-rbh w-full max-w-[240px]">
              <BodyModel
                {...modelProps}
                type={ModelType.POSTERIOR}
                data={dataCostas}
                onClick={readOnly ? undefined : makeClick("posterior")}
              />
            </div>
          </figure>
        )}
      </div>

      <style jsx global>{`
        .mapa-dor-rbh .rbh polygon {
          transition: fill 0.15s ease, filter 0.15s ease;
        }
        .mapa-dor-rbh .rbh polygon:hover {
          filter: brightness(0.94);
        }
      `}</style>
    </div>
  )
}
