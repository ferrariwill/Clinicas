import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { useAuthStore } from "@/store/auth-store"

export function rotaPrefixLiberada(
  rotas: string[],
  acessoTotal: boolean,
  prefix: string
): boolean {
  if (acessoTotal) return true
  const p = prefix.replace(/\/$/, "")
  return rotas.some((r) => r === p || r.startsWith(`${p}/`))
}

export function useMinhasPermissoesRotas() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const usuarioId = useAuthStore((s) => s.usuario?.id)
  return useQuery({
    queryKey: ["minhas-permissoes-rotas", usuarioId],
    queryFn: () => apiClient.getMinhasPermissoesRotas(),
    enabled: isAuthenticated && Boolean(usuarioId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
