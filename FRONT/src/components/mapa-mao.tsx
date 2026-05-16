"use client"

import { cn } from "@/lib/utils/cn"
import { idMao, type LadoPaciente, type SegmentoMao } from "@/components/mapa-dor-detalhe-ids"
import type { MapaDeDorValor } from "@/components/mapa-de-dor-model"

const FILL_OFF = "#f4f4f5"
const FILL_ON = "#ef4444"
const STROKE = "#a1a1aa"
const STROKE_ON = "#b91c1c"

type RegiaoSvg = { seg: SegmentoMao; d: string; label: string }

const REGIOES: RegiaoSvg[] = [
  { seg: "pulso", d: "M 70,220 L 130,220 L 125,180 L 75,180 Z", label: "Pulso" },
  { seg: "palma", d: "M 60,180 L 140,180 L 135,110 L 65,110 Z", label: "Palma" },
  { seg: "dedao", d: "M 60,160 L 25,130 L 35,110 L 65,135 Z", label: "Dedão" },
  {
    seg: "indicador",
    d: "M 67,110 L 67,40 Q 75,30 80,40 L 82,110 Z",
    label: "Indicador",
  },
  { seg: "medio", d: "M 85,110 L 85,25 Q 92,15 100,25 L 100,110 Z", label: "Médio" },
  { seg: "anelar", d: "M 103,110 L 103,35 Q 110,25 117,35 L 117,110 Z", label: "Anelar" },
  { seg: "minimo", d: "M 120,110 L 120,55 Q 126,45 133,55 L 133,110 Z", label: "Mínimo" },
]

export interface MapaMaoProps {
  lado: LadoPaciente
  titulo?: string
  estado: MapaDeDorValor
  readOnly?: boolean
  onToggle: (id: string) => void
  espelhar?: boolean
  className?: string
}

export function MapaMao({
  lado,
  titulo,
  estado,
  readOnly = false,
  onToggle,
  espelhar = false,
  className,
}: MapaMaoProps) {
  const ladoLabel = lado === "dir" ? "direita" : "esquerda"

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-zinc-200 bg-white p-4 shadow-sm",
        className
      )}
    >
      <h4 className="mb-3 text-sm font-semibold text-zinc-700">
        {titulo ?? `Mão ${ladoLabel} (paciente)`}
      </h4>
      <svg
        viewBox="0 0 200 250"
        className={cn("h-auto w-full max-w-[200px]", !readOnly && "cursor-pointer")}
        role="img"
        aria-label={`Mapa da mão ${ladoLabel}`}
      >
        <g transform={espelhar ? "translate(200,0) scale(-1,1)" : undefined}>
          {REGIOES.map(({ seg, d, label }) => {
            const id = idMao(lado, seg)
            const ativa = Boolean(estado[id]?.ativa)
            return (
              <path
                key={id}
                d={d}
                fill={ativa ? FILL_ON : FILL_OFF}
                stroke={ativa ? STROKE_ON : STROKE}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                className={cn(
                  "transition-[fill,stroke] duration-150 ease-out",
                  !readOnly && !ativa && "hover:fill-red-100"
                )}
                onClick={() => !readOnly && onToggle(id)}
                role={readOnly ? undefined : "button"}
                aria-pressed={readOnly ? undefined : ativa}
                aria-label={`Mão ${ladoLabel} — ${label}`}
              >
                <title>{`Mão ${ladoLabel} — ${label}`}</title>
              </path>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
