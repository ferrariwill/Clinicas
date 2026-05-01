"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LogOut,
  User,
  Wallet,
  LayoutDashboard,
  CalendarDays,
  Stethoscope,
  Users,
  FlaskConical,
  Link2,
  PiggyBank,
  BarChart3,
  UsersRound,
  Layers,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { computeTelasLiberadas, useMinhasPermissoesRotas } from "@/hooks/use-minhas-permissoes-rotas"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, usuario, logout, userRole } = useAuth()
  const {
    data: permRotas,
    isSuccess: permissoesOk,
    isPending: permPending,
    isError: permErro,
    refetch: refetchPermissoes,
  } = useMinhasPermissoesRotas()
  /** Só monta links do menu após GET /auth/minhas-permissoes-rotas (itens vêm do perfil na API). */
  const permParaMenu = permissoesOk ? permRotas : undefined
  const aguardandoMenuPerfil = Boolean(usuario?.id) && !permissoesOk && !permErro

  const {
    podeDashboard,
    podeAgenda,
    podeAtendimentos,
    podePacientes,
    podeFinanceiro,
    podeEquipe,
    podeProcedimentos,
    podeConvenios,
    podeGestaoTelas,
    podePagamentos,
    podeRelatorioRecebimentos,
  } = useMemo(() => computeTelasLiberadas(permParaMenu, userRole), [permParaMenu, userRole])

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

  const linkClassMobile = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium transition ${
      active
        ? "bg-slate-900 text-white dark:bg-[#4a5d78] dark:text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#323e52] dark:text-slate-200 dark:hover:bg-[#3d4d66]"
    }`

  const desktopNavLink = (active: boolean) =>
    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
      active
        ? "bg-slate-100 text-slate-900 dark:bg-[#3d4d66] dark:text-slate-50"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#323e52]"
    }`

  return (
    <div className="app-shell min-h-screen bg-gray-50 text-gray-900 transition-colors">
      <div className="flex min-h-screen min-w-0">
        <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-white px-4 py-8 lg:block dark:border-[#3d4e63] dark:bg-[#1e2633]">
          <div className="mb-8 px-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Navegação
            </p>
          </div>
          <nav className="space-y-2">
            {permErro && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-800">
                <p className="font-medium">Não foi possível carregar o menu do perfil.</p>
                <button
                  type="button"
                  onClick={() => void refetchPermissoes()}
                  className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-900 hover:bg-rose-50"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            {aguardandoMenuPerfil && (
              <p className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                {permPending ? "Carregando menu conforme seu perfil…" : "Carregando permissões…"}
              </p>
            )}
            {permissoesOk && (
              <>
                {podeDashboard && (
                  <Link href="/dashboard" className={desktopNavLink(pathname === "/dashboard")}>
                    <LayoutDashboard className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Dashboard Operacional</span>
                  </Link>
                )}
                {podeAgenda && (
                  <Link href="/agenda" className={desktopNavLink(pathname === "/agenda")}>
                    <CalendarDays className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Agenda Médica</span>
                  </Link>
                )}
                {podeAtendimentos && (
                  <Link href="/atendimentos" className={desktopNavLink(pathname.startsWith("/atendimentos"))}>
                    <Stethoscope className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Meus atendimentos</span>
                  </Link>
                )}
                {podePacientes && (
                  <Link href="/pacientes" className={desktopNavLink(pathname.startsWith("/pacientes"))}>
                    <Users className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Pacientes</span>
                  </Link>
                )}
                {podeProcedimentos && (
                  <Link href="/procedimentos" className={desktopNavLink(pathname.startsWith("/procedimentos"))}>
                    <FlaskConical className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Procedimentos</span>
                  </Link>
                )}
                {podeConvenios && (
                  <Link href="/convenios" className={desktopNavLink(pathname.startsWith("/convenios"))}>
                    <Link2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Convênios</span>
                  </Link>
                )}
                {podeFinanceiro && (
                  <Link
                    href="/financeiro"
                    className={desktopNavLink(pathname.startsWith("/financeiro") && !pathname.startsWith("/financeiro/recebimentos"))}
                  >
                    <PiggyBank className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Gestão Financeira</span>
                  </Link>
                )}
                {podeRelatorioRecebimentos && (
                  <Link href="/financeiro/recebimentos" className={desktopNavLink(pathname.startsWith("/financeiro/recebimentos"))}>
                    <BarChart3 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Recebimentos (gateway)</span>
                  </Link>
                )}
                {podePagamentos && (
                  <Link href="/pagamentos" className={desktopNavLink(pathname.startsWith("/pagamentos"))}>
                    <Wallet className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Pagamentos</span>
                  </Link>
                )}
                {podeEquipe && (
                  <Link href="/equipe" className={desktopNavLink(pathname.startsWith("/equipe"))}>
                    <UsersRound className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Equipe</span>
                  </Link>
                )}
                {podeGestaoTelas && (
                  <Link href="/gestao" className={desktopNavLink(pathname.startsWith("/gestao"))}>
                    <Layers className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>Perfis e telas</span>
                  </Link>
                )}
              </>
            )}
          </nav>
          <div className="mt-8 border-t border-gray-200 pt-4 px-2 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 truncate mb-2 dark:text-slate-400" title={usuario?.email}>
              {usuario?.nome ?? "Usuário"}
            </p>
            <Link
              href="/perfil"
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <User className="h-4 w-4 shrink-0" />
              Minha conta
            </Link>
            <button
              type="button"
              onClick={() => {
                logout()
                router.push("/login")
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sair
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="bg-white shadow-sm border-b border-gray-200 dark:border-[#3d4e63] dark:bg-[#2a3445]">
            <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
                <span className="hidden min-w-0 truncate text-sm text-slate-600 dark:text-slate-300 sm:inline max-w-[min(200px,40vw)]" title={usuario?.email}>
                  {usuario?.nome}
                </span>
                <Link
                  href="/perfil"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:text-sm"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Conta</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    router.push("/login")
                  }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </header>

          <nav
            aria-label="Navegação principal"
            className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm lg:hidden dark:border-slate-800 dark:bg-slate-900/95"
          >
            <div className="mx-auto max-w-7xl px-2 py-2">
              <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
                {permErro && (
                  <span className="shrink-0 rounded-full bg-rose-50 px-3 py-2 text-xs text-rose-800">Menu indisponível</span>
                )}
                {aguardandoMenuPerfil && !permErro && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-600">Carregando menu…</span>
                )}
                {permissoesOk && (
                  <>
                    {podeDashboard && (
                      <Link href="/dashboard" className={linkClassMobile(pathname === "/dashboard")}>
                        <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Dashboard</span>
                      </Link>
                    )}
                    {podeAgenda && (
                      <Link href="/agenda" className={linkClassMobile(pathname.startsWith("/agenda"))}>
                        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Agenda</span>
                      </Link>
                    )}
                    {podeAtendimentos && (
                      <Link href="/atendimentos" className={linkClassMobile(pathname.startsWith("/atendimentos"))}>
                        <Stethoscope className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Atend.</span>
                      </Link>
                    )}
                    {podePacientes && (
                      <Link href="/pacientes" className={linkClassMobile(pathname.startsWith("/pacientes"))}>
                        <Users className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Pacientes</span>
                      </Link>
                    )}
                    {podeProcedimentos && (
                      <Link href="/procedimentos" className={linkClassMobile(pathname.startsWith("/procedimentos"))}>
                        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Proced.</span>
                      </Link>
                    )}
                    {podeConvenios && (
                      <Link href="/convenios" className={linkClassMobile(pathname.startsWith("/convenios"))}>
                        <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Convênios</span>
                      </Link>
                    )}
                    {podeFinanceiro && (
                      <Link
                        href="/financeiro"
                        className={linkClassMobile(pathname.startsWith("/financeiro") && !pathname.startsWith("/financeiro/recebimentos"))}
                      >
                        <PiggyBank className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Financ.</span>
                      </Link>
                    )}
                    {podeRelatorioRecebimentos && (
                      <Link href="/financeiro/recebimentos" className={linkClassMobile(pathname.startsWith("/financeiro/recebimentos"))}>
                        <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Receb.</span>
                      </Link>
                    )}
                    {podePagamentos && (
                      <Link href="/pagamentos" className={linkClassMobile(pathname.startsWith("/pagamentos"))}>
                        <Wallet className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Pagtos</span>
                      </Link>
                    )}
                    {podeEquipe && (
                      <Link href="/equipe" className={linkClassMobile(pathname.startsWith("/equipe"))}>
                        <UsersRound className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Equipe</span>
                      </Link>
                    )}
                    {podeGestaoTelas && (
                      <Link href="/gestao" className={linkClassMobile(pathname.startsWith("/gestao"))}>
                        <Layers className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Perfis</span>
                      </Link>
                    )}
                  </>
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
