"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils/cn"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  filtrarEntradaBuscaCid10,
  normalizarCid10,
  validarFormatoCid10,
} from "@/lib/cid10/cid10-utils"
import { buscarNaListaCID10, codigoExisteNaLista, type ItemCID10 } from "@/lib/cid10/lista-cid10"
import { carregarCid10Recentes, registrarCid10ManualRecente } from "@/lib/cid10/cid10-recentes"

export interface BuscaCID10Props {
  id?: string
  value: string
  onChange: (next: string) => void
  /** Para histórico recente de códigos manuais (localStorage). */
  usuarioId?: string | null
  disabled?: boolean
  className?: string
}

export function BuscaCID10({ id = "busca-cid10", value, onChange, usuarioId, disabled, className }: BuscaCID10Props) {
  const [aberto, setAberto] = React.useState(false)
  const [tocado, setTocado] = React.useState(false)
  const [tickRecentes, setTickRecentes] = React.useState(0)
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dropPos, setDropPos] = React.useState<{ top: number; left: number; width: number } | null>(null)

  const syncDropPos = React.useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setDropPos({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  const recentes = React.useMemo(() => carregarCid10Recentes(usuarioId ?? undefined), [usuarioId, tickRecentes])

  const resultados = React.useMemo(() => buscarNaListaCID10(value), [value])

  const normalizado = React.useMemo(() => normalizarCid10(value), [value])
  const formatoOk = React.useMemo(() => (value.trim() ? validarFormatoCid10(normalizado) : false), [value, normalizado])
  const naLista = React.useMemo(() => (value.trim() ? codigoExisteNaLista(value) : false), [value])

  const mostrarConfirmarManual =
    aberto &&
    value.trim().length > 0 &&
    formatoOk &&
    !naLista &&
    resultados.length === 0

  const mostrarErroFormato = tocado && value.trim().length > 0 && !formatoOk

  const fecharComDelay = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    blurTimer.current = setTimeout(() => setAberto(false), 180)
  }

  const selecionarItem = (item: ItemCID10) => {
    onChange(normalizarCid10(item.codigo))
    setAberto(false)
    setTocado(false)
  }

  const selecionarRecente = (cod: string) => {
    onChange(normalizarCid10(cod))
    setAberto(false)
    setTocado(false)
  }

  const confirmarManual = () => {
    if (!formatoOk || !value.trim()) return
    const n = normalizarCid10(value)
    onChange(n)
    registrarCid10ManualRecente(usuarioId ?? undefined, n)
    setTickRecentes((t) => t + 1)
    setAberto(false)
    setTocado(false)
  }

  const recentesFiltrados = React.useMemo(() => {
    if (!value.trim()) return recentes.slice(0, 8)
    const q = value.trim().toLowerCase()
    return recentes.filter((c) => c.toLowerCase().includes(q) || c.replace(/\./g, "").includes(q.replace(/\./g, "")))
  }, [recentes, value])

  React.useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  React.useLayoutEffect(() => {
    if (!aberto || disabled) {
      setDropPos(null)
      return
    }
    syncDropPos()
    const onScrollOrResize = () => syncDropPos()
    window.addEventListener("resize", onScrollOrResize)
    document.addEventListener("scroll", onScrollOrResize, true)
    return () => {
      window.removeEventListener("resize", onScrollOrResize)
      document.removeEventListener("scroll", onScrollOrResize, true)
    }
  }, [aberto, disabled, syncDropPos, value, resultados.length, recentesFiltrados.length])

  return (
    <div ref={containerRef} className={cn("relative space-y-2", className)}>
      <Label htmlFor={id}>CID-10 (obrigatório)</Label>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        disabled={disabled}
        autoComplete="off"
        placeholder="Ex.: J06 ou resfriado"
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current)
          setAberto(true)
        }}
        onBlur={() => {
          setTocado(true)
          fecharComDelay()
        }}
        onChange={(e) => {
          onChange(filtrarEntradaBuscaCid10(e.target.value))
        }}
        className={cn(mostrarErroFormato && "border-amber-600 focus-visible:ring-amber-500")}
      />
      {mostrarErroFormato && (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Formato esperado: uma letra seguida de números (ex.: <span className="font-mono">J06.9</span> ou{" "}
          <span className="font-mono">A09</span>).
        </p>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Busque por código ou descrição. Se o código não estiver na lista, confirme o uso manual quando o formato for
        válido.
      </p>

      {aberto &&
        !disabled &&
        dropPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="listbox"
            className="fixed z-[300] max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900"
            style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width, maxWidth: "min(100vw - 16px, 520px)" }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {recentesFiltrados.length > 0 && (
              <div className="border-b border-slate-100 px-2 py-2 dark:border-slate-700">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Recentes (códigos manuais)
                </p>
                <div className="flex flex-wrap gap-1">
                  {recentesFiltrados.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800 hover:bg-sky-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      onClick={() => selecionarRecente(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {resultados.map((item) => (
              <button
                key={item.codigo}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/80"
                onClick={() => selecionarItem(item)}
              >
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-50">{item.codigo}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">{item.descricao}</span>
              </button>
            ))}

            {mostrarConfirmarManual && (
              <div className="border-t border-amber-100 bg-amber-50/80 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
                <p className="text-xs text-amber-950 dark:text-amber-100">
                  Código não encontrado na lista. Deseja usar{" "}
                  <strong className="font-mono">&quot;{normalizado}&quot;</strong> mesmo assim?
                </p>
                <Button type="button" size="sm" variant="secondary" className="mt-2 w-full text-xs" onClick={confirmarManual}>
                  Usar este código
                </Button>
              </div>
            )}

            {value.trim().length > 0 && resultados.length === 0 && !mostrarConfirmarManual && !formatoOk && (
              <p className="px-3 py-2 text-xs text-slate-500">Digite um formato válido para confirmar uso manual.</p>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
