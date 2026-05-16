import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { useAuthStore } from "@/store/auth-store"

/** Mesmo `staleTime`/`gcTime` em `use-auth` (prefetch pós-login) e aqui. */
export const MINHAS_PERMISSOES_STALE_MS = 10 * 60 * 1000
export const MINHAS_PERMISSOES_GC_MS = 30 * 60 * 1000

export function minhasPermissoesRotasQueryKey(usuarioId: string | undefined) {
  return ["minhas-permissoes-rotas", usuarioId] as const
}

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

  /** Mesmo perfil do relatório de recebimentos ou rota dedicada de repasse. */
  const podeRelatorioRepasseProfissionais =
    acessoTotalTelas ||
    rotasApi.some(
      (r) =>
        r === "/clinicas/cobrancas/relatorio-financeiro" ||
        r === "/clinicas/cobrancas/relatorio-repasse-profissionais"
    )

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
    podeRelatorioRepasseProfissionais,
  }
}

export function useMinhasPermissoesRotas() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const usuarioId = useAuthStore((s) => s.usuario?.id)
  return useQuery({
    queryKey: minhasPermissoesRotasQueryKey(usuarioId),
    queryFn: () => apiClient.getMinhasPermissoesRotas(),
    enabled: isAuthenticated && Boolean(usuarioId),
    /** Evita GET em toda troca de rota: várias telas + o layout usam a mesma query. Após login, `use-auth` dispara prefetch com a mesma chave. */
    staleTime: MINHAS_PERMISSOES_STALE_MS,
    gcTime: MINHAS_PERMISSOES_GC_MS,
  })
}
