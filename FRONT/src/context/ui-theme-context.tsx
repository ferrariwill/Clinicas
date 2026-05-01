"use client"

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, type ReactNode } from "react"

const STORAGE_KEY = "clinicas_ui_theme"

function applyLightDomTheme() {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.dataset.uiTheme = "light"
  root.classList.remove("dark")
}

type UiThemeContextValue = {
  theme: "light"
  /** Mantido por compatibilidade; o app usa apenas tema claro. */
  setTheme: (_t: "light") => void
}

const UiThemeContext = createContext<UiThemeContextValue | null>(null)

export function UiThemeProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    applyLightDomTheme()
    try {
      localStorage.setItem(STORAGE_KEY, "light")
    } catch {
      /* ignore */
    }
  }, [])

  const setTheme = useCallback(() => {
    applyLightDomTheme()
  }, [])

  const value = useMemo(() => ({ theme: "light" as const, setTheme }), [setTheme])

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>
}

export function useUiTheme() {
  const ctx = useContext(UiThemeContext)
  if (!ctx) {
    throw new Error("useUiTheme must be used within UiThemeProvider")
  }
  return ctx
}

export function useUiThemeSafe(): UiThemeContextValue {
  const ctx = useContext(UiThemeContext)
  return ctx ?? { theme: "light", setTheme: () => {} }
}
