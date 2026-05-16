"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils/cn"
import {
  NUMEROS_FDI_ORDEM,
  type EstadoDenteOdonto,
  type OdontogramaDentes,
  criarOdontogramaInicial,
} from "@/lib/odontograma-serial"

const OPCOES: { id: EstadoDenteOdonto; label: string; descricao: string }[] = [
  { id: "carie", label: "Cárie", descricao: "Amarelo" },
  { id: "canal", label: "Canal", descricao: "Azul" },
  { id: "extraido", label: "Extraído", descricao: "X vermelho" },
  { id: "saudavel", label: "Saudável", descricao: "Verde" },
]

function corDente(estado: EstadoDenteOdonto): { bg: string; border: string; text: string } {
  switch (estado) {
    case "carie":
      return { bg: "bg-amber-300", border: "border-amber-700", text: "text-amber-950" }
    case "canal":
      return { bg: "bg-blue-500", border: "border-blue-900", text: "text-white" }
    case "extraido":
      return { bg: "bg-red-500", border: "border-red-900", text: "text-white" }
    default:
      return { bg: "bg-emerald-500", border: "border-emerald-800", text: "text-white" }
  }
}

function DenteVisual({
  numero,
  estado,
  readOnly,
  onAbrirMenu,
}: {
  numero: string
  estado: EstadoDenteOdonto
  readOnly: boolean
  onAbrirMenu: (numero: string, el: HTMLElement) => void
}) {
  const c = corDente(estado)
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={(e) => {
        if (readOnly) return
        e.stopPropagation()
        onAbrirMenu(numero, e.currentTarget)
      }}
      className={cn(
        "relative flex h-11 w-7 shrink-0 flex-col items-center justify-center rounded-md border-2 text-[10px] font-bold leading-none shadow-sm transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 disabled:cursor-default disabled:opacity-95",
        c.bg,
        c.border,
        c.text
      )}
      aria-label={`Dente ${numero}, estado ${estado}`}
    >
      <span className="tabular-nums">{numero}</span>
      {estado === "extraido" && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-black leading-none text-white drop-shadow-md">
          ×
        </span>
      )}
    </button>
  )
}

type MenuPos = { numero: string; top: number; left: number }

export interface OdontogramaProps {
  /** Estado dos 32 dentes (chaves "11"…"48"). */
  value?: OdontogramaDentes
  onChange?: (next: OdontogramaDentes) => void
  /** Somente leitura (ex.: histórico no prontuário). */
  readOnly?: boolean
  className?: string
  titulo?: string
}

/**
 * Odontograma FDI (32 dentes permanentes, 11–48). Clique abre menu: Cárie, Canal, Extraído, Saudável.
 * Persistência: use `serializarOdontograma` / `deserializarOdontograma` no texto do prontuário.
 */
export function Odontograma({ value, onChange, readOnly = false, className, titulo = "Odontograma" }: OdontogramaProps) {
  const [interno, setInterno] = React.useState<OdontogramaDentes>(() => criarOdontogramaInicial())
  const controlado = value !== undefined && typeof onChange === "function"
  const dentes = controlado ? { ...criarOdontogramaInicial(), ...value } : interno

  const setDentes = React.useCallback(
    (next: OdontogramaDentes) => {
      if (controlado) onChange!(next)
      else setInterno(next)
    },
    [controlado, onChange]
  )

  const [menu, setMenu] = React.useState<MenuPos | null>(null)

  React.useEffect(() => {
    if (!menu) return
    const fechar = (e: MouseEvent) => {
      const alvo = e.target as Node
      const menuEl = document.getElementById("odontograma-menu-popup")
      if (menuEl && menuEl.contains(alvo)) return
      setMenu(null)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null)
    }
    document.addEventListener("mousedown", fechar)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", fechar)
      document.removeEventListener("keydown", esc)
    }
  }, [menu])

  const abrirMenu = React.useCallback((numero: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const w = 200
    const left = Math.min(r.left, window.innerWidth - w - 8)
    const top = r.bottom + 6
    setMenu({ numero, top, left })
  }, [])

  const aplicarEstado = (numero: string, estado: EstadoDenteOdonto) => {
    setDentes({ ...dentes, [numero]: estado })
    setMenu(null)
  }

  const superior = NUMEROS_FDI_ORDEM.slice(0, 16)
  const inferior = NUMEROS_FDI_ORDEM.slice(16, 32)

  const menuNode =
    menu &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        id="odontograma-menu-popup"
        role="menu"
        className="fixed z-[300] w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        style={{ top: menu.top, left: menu.left }}
      >
        <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
          Dente {menu.numero}
        </p>
        {OPCOES.map((op) => (
          <button
            key={op.id}
            type="button"
            role="menuitem"
            className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
            onClick={() => aplicarEstado(menu.numero, op.id)}
          >
            <span className="font-medium text-slate-900">{op.label}</span>
            <span className="text-[11px] text-slate-500">{op.descricao}</span>
          </button>
        ))}
      </div>,
      document.body
    )

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-1 text-xs text-slate-600">
        Notação FDI (11–18, 21–28, 31–38, 41–48). {readOnly ? "Registro salvo no prontuário." : "Toque em um dente para alterar o estado."}
      </p>

      <div className="mt-4 space-y-6">
        <div>
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Arcada superior
          </p>
          <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
            {superior.map((n) => (
              <DenteVisual
                key={n}
                numero={n}
                estado={dentes[n] ?? "saudavel"}
                readOnly={readOnly}
                onAbrirMenu={abrirMenu}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Arcada inferior
          </p>
          <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
            {inferior.map((n) => (
              <DenteVisual
                key={n}
                numero={n}
                estado={dentes[n] ?? "saudavel"}
                readOnly={readOnly}
                onAbrirMenu={abrirMenu}
              />
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-600">
        <li className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Saudável
        </li>
        <li className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> Cárie
        </li>
        <li className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Canal
        </li>
        <li className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Extraído
        </li>
      </ul>

      {menuNode}
    </div>
  )
}
