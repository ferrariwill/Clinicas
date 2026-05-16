"use client"

import { MapaMao } from "@/components/mapa-mao"
import type { MapaDeDorValor } from "@/components/mapa-de-dor-model"

export function MapaDeDorMaosPane({
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
        Toque nas regiões da palma e dos dedos. Perspectiva do paciente: mão direita à esquerda.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MapaMao
          lado="dir"
          titulo="Mapeamento clínico — mão direita"
          estado={estado}
          readOnly={readOnly}
          onToggle={onToggle}
        />
        <MapaMao
          lado="esq"
          titulo="Mapeamento clínico — mão esquerda"
          estado={estado}
          readOnly={readOnly}
          onToggle={onToggle}
          espelhar
        />
      </div>
    </div>
  )
}
