"use client"

import { cn } from "@/lib/utils/cn"
import type { MapaDeDorValor } from "@/components/mapa-de-dor-model"

export const MAPA_DOR_COR_DOR = "#dc2626"
export const MAPA_DOR_COR_CORPO = "#e5e7eb"
export const MAPA_DOR_COR_STROKE = "#9ca3af"
export const MAPA_DOR_COR_STROKE_ATIVO = "#b91c1c"

export function RegiaoPath({
  id,
  d,
  label,
  estado,
  readOnly,
  onToggle,
  className,
}: {
  id: string
  d: string
  label: string
  estado: MapaDeDorValor
  readOnly: boolean
  onToggle: (id: string) => void
  className?: string
}) {
  const ativa = Boolean(estado[id]?.ativa)

  return (
    <g className={cn("group", className)}>
      <path
        d={d}
        fill="transparent"
        stroke="none"
        className={readOnly ? "pointer-events-none" : "pointer-events-auto cursor-pointer"}
        onClick={() => !readOnly && onToggle(id)}
      />
      <path
        d={d}
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? -1 : 0}
        aria-label={label}
        aria-pressed={readOnly ? undefined : ativa}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill={ativa ? MAPA_DOR_COR_DOR : MAPA_DOR_COR_CORPO}
        stroke={ativa ? MAPA_DOR_COR_STROKE_ATIVO : MAPA_DOR_COR_STROKE}
        strokeWidth={ativa ? 0.7 : 0.5}
        className={cn(
          "pointer-events-none transition-[fill,stroke,filter] duration-150 ease-out outline-none",
          !readOnly && !ativa && "group-hover:fill-red-50",
          !readOnly && ativa && "drop-shadow-sm"
        )}
        onClick={() => !readOnly && onToggle(id)}
        onKeyDown={(e) => {
          if (readOnly) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggle(id)
          }
        }}
      >
        <title>{label}</title>
      </path>
    </g>
  )
}
