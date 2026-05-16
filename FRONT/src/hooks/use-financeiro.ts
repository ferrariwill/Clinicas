import { useMutation, useQuery, useQueryClient, UseMutationResult } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type {
  LancamentoFinanceiro,
  ResumoFinanceiro,
  CriarLancamentoRequest,
  FiltrosFinanceiro,
  CustoFixo,
  FechamentoPreviewResponse,
  FechamentoListaItem,
  FechamentoDetalheResponse,
  CriarFechamentoRequest,
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
      return (raw as CustoFixo[]).map((c) => {
        let dia = Number((c as { dia_previsto_pagamento?: number }).dia_previsto_pagamento)
        if (!Number.isFinite(dia) || dia < 1 || dia > 31) dia = 1
        return {
          ...c,
          id: String(c.id),
          valor_mensal: Number(c.valor_mensal),
          ativo: Boolean(c.ativo),
          dia_previsto_pagamento: dia,
        }
      })
    },
    staleTime: 60 * 1000,
  })
}

export const useCriarCustoFixo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { descricao: string; valor_mensal: number; dia_previsto_pagamento?: number }) =>
      apiClient.criarCustoFixo(data),
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
      data: { descricao: string; valor_mensal: number; ativo?: boolean; dia_previsto_pagamento?: number }
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

export const useFechamentoPreview = (dataInicio: string, dataFim: string, enabled: boolean) => {
  const ok =
    enabled &&
    Boolean(dataInicio) &&
    Boolean(dataFim) &&
    dataInicio <= dataFim
  return useQuery<FechamentoPreviewResponse>({
    queryKey: ["fechamento-preview", dataInicio, dataFim],
    enabled: ok,
    queryFn: () => apiClient.getFechamentoPreview(dataInicio, dataFim),
    staleTime: 30 * 1000,
  })
}

export const useFechamentosFinanceirosList = (enabled: boolean) => {
  return useQuery<FechamentoListaItem[]>({
    queryKey: ["fechamentos-financeiros"],
    enabled,
    queryFn: () => apiClient.listFechamentosFinanceiros(),
    staleTime: 60 * 1000,
  })
}

export const useFechamentoFinanceiroDetalhe = (id: string | null, enabled: boolean) => {
  return useQuery<FechamentoDetalheResponse>({
    queryKey: ["fechamento-financeiro", id],
    enabled: enabled && Boolean(id),
    queryFn: () => apiClient.getFechamentoFinanceiro(id as string),
  })
}

export const useCriarFechamentoFinanceiro = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CriarFechamentoRequest) => apiClient.criarFechamentoFinanceiro(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos-financeiros"] })
      queryClient.invalidateQueries({ queryKey: ["fechamento-preview"] })
      queryClient.invalidateQueries({ queryKey: ["lancamentos-financeiros"] })
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] })
      toast.success("Fechamento salvo com sucesso.")
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err.message || "Erro ao salvar fechamento")
    },
  })
}