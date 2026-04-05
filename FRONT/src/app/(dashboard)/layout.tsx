"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  const pathname = usePathname()

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-white px-4 py-8 lg:block">
          <div className="mb-8 px-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Navegação
            </p>
          </div>
          <nav className="space-y-2">
            <Link href="/dashboard" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname === "/dashboard" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
              Dashboard Operacional
            </Link>
            <Link href="/agenda" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname === "/agenda" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
              Agenda Médica
            </Link>
            <Link href="/pacientes" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/pacientes") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
              Pacientes
            </Link>
            <Link href="/financeiro" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/financeiro") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
              Gestão Financeira
            </Link>
          </nav>
        </aside>

        <div className="flex-1">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
