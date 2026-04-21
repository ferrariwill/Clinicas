import { NextRequest, NextResponse } from "next/server"

const publicRoutes = ["/login", "/esqueci-senha", "/redefinir-senha"]

/** Rotas que exigem JWT no cookie. */
const protectedRoutes = [
  "/dashboard",
  "/pacientes",
  "/agenda",
  "/usuarios",
  "/financeiro",
  "/admin",
  "/equipe",
  "/atendimentos",
  "/procedimentos",
  "/convenios",
  "/gestao",
  "/trocar-senha",
]

function obrigarTrocaSenhaFromCookie(raw: string | undefined): boolean {
  if (!raw) return false
  try {
    const u = JSON.parse(raw) as { obrigar_troca_senha?: boolean }
    return Boolean(u.obrigar_troca_senha)
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get("auth_token")?.value
  const userRole = request.cookies.get("user_role")?.value
  const userInfo = request.cookies.get("user_info")?.value
  const obrigar = obrigarTrocaSenhaFromCookie(userInfo)

  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r))
  const isProtectedRoute = protectedRoutes.some((r) => pathname.startsWith(r))

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  /** Primeiro acesso ou recuperação de senha: só libera a tela de troca até concluir. */
  if (
    token &&
    obrigar &&
    !pathname.startsWith("/trocar-senha") &&
    pathname !== "/login" &&
    !pathname.startsWith("/esqueci-senha") &&
    !pathname.startsWith("/redefinir-senha")
  ) {
    return NextResponse.redirect(new URL("/trocar-senha", request.url))
  }

  if (pathname === "/login" && token) {
    if (obrigar) {
      return NextResponse.redirect(new URL("/trocar-senha", request.url))
    }
    const dest = userRole === "ADM_GERAL" ? "/admin/dashboard" : "/dashboard"
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (pathname === "/") {
    if (token) {
      if (obrigar) {
        return NextResponse.redirect(new URL("/trocar-senha", request.url))
      }
      const dest = userRole === "ADM_GERAL" ? "/admin/dashboard" : "/dashboard"
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (token && userRole === "ADM_GERAL" && pathname.startsWith("/dashboard") && !pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Evita rodar middleware em estáticos, RSC/data e API.
     * Padrão recomendado pelo Next.js (evita efeitos colaterais no Vercel).
     */
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|.*\\..*).*)",
  ],
}
