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

/** Resposta de GET /auth/minhas-permissoes-rotas (rotas = FullPath da API). */
export type MinhasPermRotasPayload = {
  rotas: string[]
  acesso_total: boolean
}

/**
 * Alinha menu e guards ao que a API retorna para o tipo_usuario_id do token.
 * Não usar hasPermission(SECRETARIA) para itens de menu — isso ignorava "Perfis e telas".
 * O dono ajusta quais rotas viram menu em Gestão → Perfis e telas (permissões por tipo de usuário na clínica).
 */
function papelNorm(r: string | null): string {
  return (r ?? "").trim().toUpperCase()
}

export function computeTelasLiberadas(
  perm: MinhasPermRotasPayload | undefined,
  userRole: string | null
) {
  const p = papelNorm(userRole)
  /** Somente o que a API retornar (dono já vem com acesso_total no token de perfis). */
  const acessoTotalTelas = Boolean(perm?.acesso_total)
  const rotasApi = perm?.rotas ?? []

  const podeGestaoPerfis = p === "DONO" || p === "DONO_CLINICA" || p === "ADM_GERAL"

  /** Só o item de menu "Dashboard" se a rota base estiver liberada; subrotas (/dashboard/…) não bastam. */
  const podeDashboard =
    acessoTotalTelas ||
    rotasApi.some((r) => (r ?? "").trim().replace(/\/+$/, "") === "/dashboard")

  const podeAgenda = rotaPrefixLiberada(rotasApi, acessoTotalTelas, "/clinicas/agenda")
  /** Tela de catálogo /clinicas/atendimentos (API); não confundir com só ter /clinicas/agenda. */
  const podeAtendimentos =
    acessoTotalTelas || rotaPrefixLiberada(rotasApi, false, "/clinicas/atendimentos")

  const podePacientes = rotaPrefixLiberada(rotasApi, acessoTotalTelas, "/pacientes")

  const podeFinanceiro =
    acessoTotalTelas ||
    rotasApi.some(
      (r) => r === "/financeiro/abrir" || r.startsWith("/clinicas/financeiro")
    )

  const podeEquipe =
    acessoTotalTelas ||
    rotaPrefixLiberada(rotasApi, false, "/clinicas/equipe") ||
    rotaPrefixLiberada(rotasApi, false, "/usuarios") ||
    rotasApi.some((r) => r.startsWith("/clinicas/usuarios")) ||
    rotaPrefixLiberada(rotasApi, false, "/clinicas/tipos-usuario")

  const podeProcedimentos = rotaPrefixLiberada(rotasApi, acessoTotalTelas, "/procedimentos")
  const podeConvenios = rotaPrefixLiberada(rotasApi, acessoTotalTelas, "/convenios")

  const podeGestaoTelas =
    podeGestaoPerfis &&
    (acessoTotalTelas || rotaPrefixLiberada(rotasApi, false, "/clinicas/gestao"))

  const podePagamentos =
    acessoTotalTelas || rotaPrefixLiberada(rotasApi, false, "/clinicas/cobrancas")

  const podeRelatorioRecebimentos =
    acessoTotalTelas || rotasApi.some((r) => r === "/clinicas/cobrancas/relatorio-financeiro")

  return {
    acessoTotalTelas,
    rotasApi,
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
  }
}

export function useMinhasPermissoesRotas() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const usuarioId = useAuthStore((s) => s.usuario?.id)
  return useQuery({
    queryKey: ["minhas-permissoes-rotas", usuarioId],
    queryFn: () => apiClient.getMinhasPermissoesRotas(),
    enabled: isAuthenticated && Boolean(usuarioId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  })
}
