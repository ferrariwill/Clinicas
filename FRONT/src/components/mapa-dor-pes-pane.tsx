"use client"

import { MapaPe } from "@/components/mapa-pe"
import type { MapaDeDorValor } from "@/components/mapa-de-dor-model"

export function MapaDeDorPesPane({
  estado,
  readOnly,
  onToggle,
}: {
  estado: MapaDeDorValor
  readOnly: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">
        Marque calcanhar, arco plantar e cada dedo. Pé direito à esquerda da figura.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MapaPe
          lado="dir"
          titulo="Mapeamento clínico — pé direito"
          estado={estado}
          readOnly={readOnly}
          onToggle={onToggle}
        />
        <MapaPe
          lado="esq"
          titulo="Mapeamento clínico — pé esquerdo"
          estado={estado}
          readOnly={readOnly}
          onToggle={onToggle}
          espelhar
        />
      </div>
    </div>
  )
}
