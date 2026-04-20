import { useMutation, useQuery, useQueryClient, UseMutationResult } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type {
  LancamentoFinanceiro,
  ResumoFinanceiro,
  CriarLancamentoRequest,
  FiltrosFinanceiro,
  CustoFixo,
} from "@/types/api"
import { toast } from "sonner"

export const useLancamentosFinanceiros = (filtros?: FiltrosFinanceiro) => {
  return useQuery<LancamentoFinanceiro[]>({
    queryKey: ["lancamentos-financeiros", filtros],
    queryFn: async (): Promise<LancamentoFinanceiro[]> => {
      const response = await apiClient.getLancamentosFinanceiros(filtros)
      return (Array.isArray(response) ? response : response.lancamentos ?? []) as LancamentoFinanceiro[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

export const useResumoFinanceiro = (dataInicio?: string, dataFim?: string) => {
  return useQuery<ResumoFinanceiro>({
    queryKey: ["resumo-financeiro", dataInicio, dataFim],
    queryFn: async (): Promise<ResumoFinanceiro> => {
      const response = await apiClient.getResumoFinanceiro(dataInicio, dataFim)
      return response
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useCriarLancamento = (): UseMutationResult<LancamentoFinanceiro, unknown, CriarLancamentoRequest, unknown> => {
  const queryClient = useQueryClient()

  return useMutation<LancamentoFinanceiro, unknown, CriarLancamentoRequest, unknown>({
    mutationFn: async (data: CriarLancamentoRequest) => {
      return await apiClient.criarLancamentoFinanceiro(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos-financeiros"] })
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] })
      toast.success("Lançamento financeiro criado com sucesso!")
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err.message || "Erro ao criar lançamento financeiro")
    },
  })
}

export const useCustosFixos = (ativos?: boolean) => {
  return useQuery<CustoFixo[]>({
    queryKey: ["custos-fixos", ativos],
    queryFn: async () => {
      const response = await apiClient.getCustosFixos(ativos)
      const raw = (response as { custos_fixos?: unknown[] }).custos_fixos ?? []
      return (raw as CustoFixo[]).map((c) => ({
        ...c,
        id: String(c.id),
        valor_mensal: Number(c.valor_mensal),
        ativo: Boolean(c.ativo),
      }))
    },
    staleTime: 60 * 1000,
  })
}

export const useCriarCustoFixo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { descricao: string; valor_mensal: number }) => apiClient.criarCustoFixo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custos-fixos"] })
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] })
      toast.success("Custo fixo cadastrado.")
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err.message || "Erro ao cadastrar custo fixo")
    },
  })
}

export const useAtualizarCustoFixo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { descricao: string; valor_mensal: number; ativo?: boolean }
    }) => apiClient.atualizarCustoFixo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custos-fixos"] })
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] })
      toast.success("Custo fixo atualizado.")
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err.message || "Erro ao atualizar custo fixo")
    },
  })
}