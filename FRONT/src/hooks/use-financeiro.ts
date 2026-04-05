import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type { LancamentoFinanceiro, ResumoFinanceiro, CriarLancamentoRequest, FiltrosFinanceiro } from "@/types/api"
import { toast } from "sonner"

export const useLancamentosFinanceiros = (filtros?: FiltrosFinanceiro) => {
  return useQuery<LancamentoFinanceiro[]>(
    ["lancamentos-financeiros", filtros],
    async () => {
      const response = await apiClient.getLancamentosFinanceiros(filtros)
      return Array.isArray(response) ? response : response.lancamentos ?? []
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )
}

export const useResumoFinanceiro = (dataInicio?: string, dataFim?: string) => {
  return useQuery<ResumoFinanceiro>(
    ["resumo-financeiro", dataInicio, dataFim],
    async () => {
      const response = await apiClient.getResumoFinanceiro(dataInicio, dataFim)
      return response
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

export const useCriarLancamento = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (data: CriarLancamentoRequest) => {
      return await apiClient.criarLancamentoFinanceiro(data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["lancamentos-financeiros"])
        queryClient.invalidateQueries(["resumo-financeiro"])
        toast.success("Lançamento financeiro criado com sucesso!")
      },
      onError: (error: any) => {
        toast.error(error.message || "Erro ao criar lançamento financeiro")
      },
    }
  )
}