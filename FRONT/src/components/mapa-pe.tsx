"use client"

import { cn } from "@/lib/utils/cn"
import { idPe, type LadoPaciente, type SegmentoPe } from "@/components/mapa-dor-detalhe-ids"
import type { MapaDeDorValor } from "@/components/mapa-de-dor-model"

const FILL_OFF = "#f4f4f5"
const FILL_ON = "#ef4444"
const STROKE = "#a1a1aa"
const STROKE_ON = "#b91c1c"

type RegiaoPath = { seg: SegmentoPe; tipo: "path"; d: string; label: string }
type RegiaoCircle = { seg: SegmentoPe; tipo: "circle"; cx: number; cy: number; r: number; label: string }

const REGIOES: (RegiaoPath | RegiaoCircle)[] = [
  {
    seg: "calcanhar",
    tipo: "path",
    d: "M 70,250 C 70,270 130,270 130,250 L 125,200 L 75,200 Z",
    label: "Calcanhar",
  },
  {
    seg: "arco",
    tipo: "path",
    d: "M 75,200 L 125,200 C 135,140 135,110 135,90 L 65,90 C 60,110 65,140 75,200 Z",
    label: "Arco do pé",
  },
  { seg: "dedao", tipo: "circle", cx: 62, cy: 55, r: 16, label: "Dedão" },
  { seg: "dedo-2", tipo: "circle", cx: 92, cy: 50, r: 11, label: "2º dedo" },
  { seg: "dedo-3", tipo: "circle", cx: 120, cy: 55, r: 10, label: "3º dedo" },
  { seg: "dedo-4", tipo: "circle", cx: 144, cy: 65, r: 9, label: "4º dedo" },
  { seg: "dedo-mizinho", tipo: "circle", cx: 164, cy: 80, r: 8, label: "5º dedo" },
]

export interface MapaPeProps {
  lado: LadoPaciente
  titulo?: string
  estado: MapaDeDorValor
  readOnly?: boolean
  onToggle: (id: string) => void
  espelhar?: boolean
  className?: string
}

export function MapaPe({
  lado,
  titulo,
  estado,
  readOnly = false,
  onToggle,
  espelhar = false,
  className,
}: MapaPeProps) {
  const ladoLabel = lado === "dir" ? "direito" : "esquerdo"

  const renderRegiao = (reg: RegiaoPath | RegiaoCircle) => {
    const id = idPe(lado, reg.seg)
    const ativa = Boolean(estado[id]?.ativa)
    const fill = ativa ? FILL_ON : FILL_OFF
    const stroke = ativa ? STROKE_ON : STROKE
    const common = {
      fill,
      stroke,
      strokeWidth: 1.5,
      vectorEffect: "non-scaling-stroke" as const,
      className: cn(
        "transition-[fill,stroke] duration-150 ease-out",
        !readOnly && !ativa && "hover:fill-red-100"
      ),
      onClick: () => !readOnly && onToggle(id),
      role: readOnly ? undefined : ("button" as const),
      "aria-pressed": readOnly ? undefined : ativa,
      "aria-label": `Pé ${ladoLabel} — ${reg.label}`,
      children: <title>{`Pé ${ladoLabel} — ${reg.label}`}</title>,
    }

    if (reg.tipo === "path") {
      return <path key={id} d={reg.d} {...common} />
    }
    return <circle key={id} cx={reg.cx} cy={reg.cy} r={reg.r} {...common} />
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-zinc-200 bg-white p-4 shadow-sm",
        className
      )}
    >
      <h4 className="mb-3 text-sm font-semibold text-zinc-700">
        {titulo ?? `Pé ${ladoLabel} (paciente)`}
      </h4>
      <svg
        viewBox="0 0 200 280"
        className={cn("h-auto w-full max-w-[200px]", !readOnly && "cursor-pointer")}
        role="img"
        aria-label={`Mapa do pé ${ladoLabel}`}
      >
        <g transform={espelhar ? "translate(200,0) scale(-1,1)" : undefined}>
          {REGIOES.map(renderRegiao)}
        </g>
      </svg>
    </div>
  )
}
