import { useMutation, useQuery, useQueryClient, UseMutationResult } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type { LancamentoFinanceiro, ResumoFinanceiro, CriarLancamentoRequest, FiltrosFinanceiro } from "@/types/api"
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
      toast.success("Lançamento financeiro criado com sucesso!")
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err.message || "Erro ao criar lançamento financeiro")
    },
  })
}