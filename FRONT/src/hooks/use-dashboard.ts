import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { toast } from "sonner"
import type { MetricasOperacionaisSwagger, ResumoFinanceiro } from "@/types/api"

export type MetricasOperacionais = MetricasOperacionaisSwagger

export const useDashboardMetrics = (clinicaId?: string) => {
  return useQuery({
    queryKey: ["dashboard-metrics", clinicaId],
    queryFn: async () => {
      try {
        const data = await apiClient.getMetricasOperacionais(clinicaId)
        return data as MetricasOperacionais
      } catch (error: unknown) {
        const err = error as { message?: string }
        const errorMessage =
          err?.message || "Erro ao carregar métricas da clínica"
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

export const useResumoFinanceiroMes = (clinicaId?: string) => {
  const hoje = new Date()
  const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const dataInicio = primeiro.toISOString().split('T')[0]
  const dataFim = hoje.toISOString().split('T')[0]

  return useQuery({
    queryKey: ["resumo-financeiro-mes", clinicaId, dataInicio, dataFim],
    enabled: Boolean(clinicaId),
    queryFn: async () => {
      try {
        const data = await apiClient.getResumoFinanceiro(dataInicio, dataFim)
        return data as ResumoFinanceiro
      } catch (error: unknown) {
        // Não fazer toast error aqui para não poluir a UI se houver erro
        const msg =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : String(error)
        console.warn("Resumo financeiro indisponível:", msg || "(sem detalhe)")
        // Retornar valores padrão em caso de erro
        return {
          totalEntradas: 0,
          totalSaidas: 0,
          saldoLiquido: 0
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

export const useDashboard = (clinicaId?: string) => {
  return useQuery({
    queryKey: ["dashboard", clinicaId],
    queryFn: async () => {
      try {
        const data = await apiClient.getDashboard()
        return data
      } catch (error: unknown) {
        const err = error as { message?: string }
        const errorMessage =
          err?.message || "Erro ao carregar dashboard"
        toast.error(errorMessage)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

export const useAgendamentosHoje = (clinicaId?: string) => {
  return useQuery({
    queryKey: ["agendamentos-hoje", clinicaId],
    queryFn: async () => {
      try {
        const data = await apiClient.getAgendamentosHoje()
        return data
      } catch (error: unknown) {
        const err = error as { message?: string }
        const errorMessage =
          err?.message || "Erro ao carregar agendamentos de hoje"
        toast.error(errorMessage)
        throw error
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })
}

export const useEstatisticas = (clinicaId?: string) => {
  return useQuery({
    queryKey: ["estatisticas", clinicaId],
    queryFn: async () => {
      try {
        const data = await apiClient.getEstatisticas()
        return data
      } catch (error: unknown) {
        const err = error as { message?: string }
        const errorMessage =
          err?.message || "Erro ao carregar estatísticas"
        toast.error(errorMessage)
        throw error
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  })
}
