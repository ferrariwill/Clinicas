"use client"

import * as React from "react"
import { cn } from "@/lib/utils/cn"

/** gap-3 = 12px — rodapé padrão de modais (flex + wrap, largura total). */
export function ModalActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap gap-3",
        "flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

/** Alias semântico para `ModalActions`. */
export const ModalFooter = ModalActions

const modalBtnBase = cn(
  "inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50",
  "sm:w-auto"
)

const variantClass: Record<"primary" | "secondary" | "danger", string> = {
  primary:
    "border border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700 focus-visible:ring-blue-500 dark:hover:bg-blue-600",
  secondary:
    "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:ring-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  danger:
    "border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50 focus-visible:ring-red-400 dark:border-red-900/40 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30",
}

export type ModalButtonVariant = keyof typeof variantClass

export type ModalButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ModalButtonVariant
}

export const ModalButton = React.forwardRef<HTMLButtonElement, ModalButtonProps>(
  ({ className, variant = "secondary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(modalBtnBase, variantClass[variant], className)}
      {...props}
    />
  )
)
ModalButton.displayName = "ModalButton"

/** Props para ícones Lucide dentro de botões de modal (tamanho e traço uniformes). */
export const modalIconProps = { className: "size-4 shrink-0", strokeWidth: 1.75 } as const
