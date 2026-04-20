"use client"

import { DayPicker } from "react-day-picker"
import { ptBR } from "react-day-picker/locale/pt-BR"
import { format, startOfDay } from "date-fns"
import { ptBR as ptBRDateFns } from "date-fns/locale"
import "react-day-picker/dist/style.css"

interface CalendarProps {
  selected: Date
  onSelect: (date: Date) => void
}

export function Calendar({ selected, onSelect }: CalendarProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Data selecionada</p>
          <p className="text-lg font-semibold text-slate-900">
            {format(selected, "dd/MM/yyyy", { locale: ptBRDateFns })}
          </p>
        </div>
      </div>

      <DayPicker
        mode="single"
        locale={ptBR}
        selected={selected}
        onSelect={(date) => date && onSelect(date)}
        disabled={{ before: startOfDay(new Date()) }}
        className="rounded-3xl"
        styles={{
          caption: { marginBottom: 12 },
          table: { width: "100%" },
        }}
      />
    </div>
  )
}
