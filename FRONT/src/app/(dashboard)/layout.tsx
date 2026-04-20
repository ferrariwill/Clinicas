"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { rotaPrefixLiberada, useMinhasPermissoesRotas } from "@/hooks/use-minhas-permissoes-rotas"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, usuario, logout, hasPermission, userRole } = useAuth()
  const { data: permRotas } = useMinhasPermissoesRotas()
  const canGestaoPerfis = hasPermission(["DONO", "DONO_CLINICA", "ADM_GERAL"])
  const canAtendimentos = hasPermission(["MEDICO", "DONO", "DONO_CLINICA", "SECRETARIA"])

  const acessoTotalTelas = useMemo(() => {
    if (permRotas?.acesso_total) return true
    if (userRole === "DONO") return true
    return false
  }, [permRotas?.acesso_total, userRole])

  const rotasApi = permRotas?.rotas ?? []

  const podeDashboard = useMemo(() => {
    if (acessoTotalTelas) return true
    return rotasApi.some((r) => r === "/dashboard" || r.startsWith("/dashboard/"))
  }, [acessoTotalTelas, rotasApi])

  const podeAgenda = useMemo(
    () => rotaPrefixLiberada(rotasApi, acessoTotalTelas, "/clinicas/agenda"),
    [rotasApi, acessoTotalTelas]
  )
  const podePacientes = useMemo(
    () => rotaPrefixLiberada(rotasApi, acessoTotalTelas, "/pacientes"),
    [rotasApi, acessoTotalTelas]
  )
  const podeFinanceiro = useMemo(() => {
    if (acessoTotalTelas) return true
    return rotasApi.some(
      (r) => r === "/financeiro/abrir" || r.startsWith("/clinicas/financeiro")
    )
  }, [acessoTotalTelas, rotasApi])
  const podeEquipe = useMemo(() => {
    if (acessoTotalTelas) return true
    return (
      rotaPrefixLiberada(rotasApi, false, "/usuarios") ||
      rotasApi.some((r) => r.startsWith("/clinicas/usuarios"))
    )
  }, [acessoTotalTelas, rotasApi])
  const podeProcedimentos = useMemo(
    () => rotaPrefixLiberada(rotasApi, acessoTotalTelas, "/procedimentos"),
    [rotasApi, acessoTotalTelas]
  )
  const podeConvenios = useMemo(
    () => rotaPrefixLiberada(rotasApi, acessoTotalTelas, "/convenios"),
    [rotasApi, acessoTotalTelas]
  )
  const podeGestaoTelas = useMemo(() => {
    if (!canGestaoPerfis) return false
    if (acessoTotalTelas) return true
    return rotaPrefixLiberada(rotasApi, false, "/clinicas/gestao")
  }, [canGestaoPerfis, acessoTotalTelas, rotasApi])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  const pathname = usePathname()

  if (!isAuthenticated) {
    return null
  }

  /** Troca obrigatória de senha: layout enxuto sem menu lateral. */
  if (pathname === "/trocar-senha") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-600">
          Clínicas — segurança da conta
        </div>
        {children}
      </div>
    )
  }

  const linkClass = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${
      active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen min-w-0">
        <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-white px-4 py-8 lg:block">
          <div className="mb-8 px-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Navegação
            </p>
          </div>
          <nav className="space-y-2">
            {podeDashboard && (
              <Link href="/dashboard" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname === "/dashboard" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Dashboard Operacional
              </Link>
            )}
            {podeAgenda && (
              <Link href="/agenda" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname === "/agenda" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Agenda Médica
              </Link>
            )}
            {canAtendimentos && (
              <Link href="/atendimentos" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/atendimentos") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Meus atendimentos
              </Link>
            )}
            {podePacientes && (
              <Link href="/pacientes" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/pacientes") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Pacientes
              </Link>
            )}
            {podeProcedimentos && (
              <Link href="/procedimentos" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/procedimentos") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Procedimentos
              </Link>
            )}
            {podeConvenios && (
              <Link href="/convenios" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/convenios") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Convênios
              </Link>
            )}
            {podeFinanceiro && (
              <Link href="/financeiro" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/financeiro") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Gestão Financeira
              </Link>
            )}
            {podeEquipe && (
              <Link href="/equipe" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/equipe") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Equipe
              </Link>
            )}
            {podeGestaoTelas && (
              <Link href="/gestao" className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname.startsWith("/gestao") ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
                Perfis e telas
              </Link>
            )}
          </nav>
          <div className="mt-8 border-t border-gray-200 pt-4 px-2">
            <p className="text-xs font-medium text-slate-500 truncate mb-2" title={usuario?.email}>
              {usuario?.nome ?? "Usuário"}
            </p>
            <button
              type="button"
              onClick={() => {
                logout()
                router.push("/login")
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sair
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl shrink-0">Dashboard</h1>
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <span className="hidden min-w-0 truncate text-sm text-slate-600 sm:inline max-w-[min(200px,40vw)]" title={usuario?.email}>
                  {usuario?.nome}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    router.push("/login")
                  }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </header>

          <nav
            aria-label="Navegação principal"
            className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-2 py-2">
              <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
                {podeDashboard && (
                  <Link href="/dashboard" className={linkClass(pathname === "/dashboard")}>
                    Dashboard
                  </Link>
                )}
                {podeAgenda && (
                  <Link href="/agenda" className={linkClass(pathname.startsWith("/agenda"))}>
                    Agenda
                  </Link>
                )}
                {canAtendimentos && (
                  <Link href="/atendimentos" className={linkClass(pathname.startsWith("/atendimentos"))}>
                    Atendimentos
                  </Link>
                )}
                {podePacientes && (
                  <Link href="/pacientes" className={linkClass(pathname.startsWith("/pacientes"))}>
                    Pacientes
                  </Link>
                )}
                {podeProcedimentos && (
                  <Link href="/procedimentos" className={linkClass(pathname.startsWith("/procedimentos"))}>
                    Proced.
                  </Link>
                )}
                {podeConvenios && (
                  <Link href="/convenios" className={linkClass(pathname.startsWith("/convenios"))}>
                    Convênios
                  </Link>
                )}
                {podeFinanceiro && (
                  <Link href="/financeiro" className={linkClass(pathname.startsWith("/financeiro"))}>
                    Financeiro
                  </Link>
                )}
                {podeEquipe && (
                  <Link href="/equipe" className={linkClass(pathname.startsWith("/equipe"))}>
                    Equipe
                  </Link>
                )}
                {podeGestaoTelas && (
                  <Link href="/gestao" className={linkClass(pathname.startsWith("/gestao"))}>
                    Perfis
                  </Link>
                )}
              </div>
            </div>
          </nav>

          <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
