import { NextRequest, NextResponse } from "next/server"

const publicRoutes = ["/login", "/esqueci-senha", "/redefinir-senha"]
const protectedRoutes = ["/dashboard", "/pacientes", "/agenda", "/usuarios", "/financeiro", "/admin"]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get("auth_token")?.value
  const userRole = request.cookies.get("user_role")?.value

  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r))
  const isProtectedRoute = protectedRoutes.some((r) => pathname.startsWith(r))

  // Sem token em rota protegida → login
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Logado tentando acessar login → redireciona para área correta
  if (pathname === "/login" && token) {
    const dest = userRole === "ADM_GERAL" ? "/admin/dashboard" : "/dashboard"
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Raiz → redireciona para área correta
  if (pathname === "/") {
    if (token) {
      const dest = userRole === "ADM_GERAL" ? "/admin/dashboard" : "/dashboard"
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // ADM_GERAL tentando acessar área de clínica → redireciona para admin
  if (token && userRole === "ADM_GERAL" && pathname.startsWith("/dashboard") && !pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
