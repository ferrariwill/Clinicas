"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useDashboardMetrics, useResumoFinanceiroMes } from "@/hooks/use-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClinicaSelector } from "@/components/clinica-selector"
import MetricCard from "@/components/metric-card"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatPercentage, formatTime, formatNumber } from "@/lib/utils/formatters"
import { obterLucroFinal } from "@/lib/utils/lucro-helper"
import {
  TrendingUp,
  Users,
  AlertCircle,
  RefreshCw,
  DollarSign,
} from "lucide-react"

/**
 * Dashboard Operacional com integração de dados financeiros
 * 
 * Este dashboard integra dois módulos de negócio:
 * 1. Agenda: Agendamentos realizados geram receitas
 * 2. Financeiro: Despesas manuais são abatidas do lucro
 * 
 * O lucro líquido é calculado como:
 * Lucro = Faturamento (agendamentos) - Despesas (módulo financeiro)
 */
export default function DashboardOperacionalPage() {
  const { usuario, clinicaId } = useAuth()
  const [selectedClinicaId, setSelectedClinicaId] = useState<string | undefined>(clinicaId ?? undefined)

  useEffect(() => {
    if (!selectedClinicaId && clinicaId) {
      setSelectedClinicaId(clinicaId)
    }
  }, [clinicaId, selectedClinicaId])

  const { data, isLoading, isError, error, refetch } = useDashboardMetrics(
    selectedClinicaId
  )
  const { data: resumoFinanceiro, isLoading: loadingFinanceiro } = useResumoFinanceiroMes(selectedClinicaId)

  const handleClinicaChange = (novaClinicaId: string) => {
    setSelectedClinicaId(novaClinicaId)
  }

  // Cálculo de Lucro Líquido
  // Faturamento mensal vem dos agendamentos marcados como REALIZADO
  // Despesas (totalSaidas) vêm do módulo de Gestão Financeira
  const faturamento = data?.faturamento_mensal ?? 0
  const despesas = resumoFinanceiro?.totalSaidas ?? 0
  const lucroLiquido = faturamento - despesas
  
  // Saldo financeiro considera entradas - saídas (inclui receitas manuais)
  const saldoFinanceiro = resumoFinanceiro?.saldoLiquido ?? 0

  // Lucro total usa a integração completa
  const lucroTotal = obterLucroFinal(lucroLiquido, saldoFinanceiro)

  const metrics = {
    faturamento_mensal: faturamento,
    no_show_taxa: data?.no_show_taxa ?? 0,
    total_atendimentos: data?.total_atendimentos ?? 0,
    tempo_medio_consulta: data?.tempo_medio_consulta ?? 0,
    lotacao_media: data?.lotacao_media ?? 0,
    taxa_conversao: data?.taxa_conversao ?? 0,
    satisfacao_media: data?.satisfacao_media ?? 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Operacional
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Bem-vindo, {usuario?.nome}!
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ClinicaSelector onClinicaChange={handleClinicaChange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Erro ao carregar métricas</h3>
            <p className="text-red-700 text-sm mt-1">
              {error instanceof Error ? error.message : "Tente novamente em alguns momentos"}
            </p>
          </div>
        </div>
      )}

      {/* Principal */}
      <div className="grid gap-4 xl:grid-cols-[2.5fr_1fr]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {isLoading || loadingFinanceiro ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                title="Faturamento Mensal"
                description="Arrecadação do mês"
                value={formatCurrency(metrics.faturamento_mensal)}
                icon={TrendingUp}
                trend="up"
                trendValue="Receitas de agendamentos realizados"
                variant="success"
              />

              <MetricCard
                title="Lucro Líquido"
                description="Faturamento - Despesas do mês"
                value={formatCurrency(lucroTotal)}
                icon={DollarSign}
                trend={lucroTotal > 0 ? "up" : "down"}
                trendValue={lucroTotal > 0 ? "Resultado positivo" : "Resultado negativo"}
                variant={lucroTotal > 0 ? "success" : "warning"}
              />

              <MetricCard
                title="Taxa de No-Show"
                description="Faltas em agendamentos"
                value={formatPercentage(metrics.no_show_taxa)}
                icon={AlertCircle}
                trend={metrics.no_show_taxa > 10 ? "down" : "neutral"}
                trendValue={metrics.no_show_taxa > 10 ? "Acima do ideal" : "Estável"}
                variant="warning"
              />

              <MetricCard
                title="Total de Atendimentos"
                description="Atendimentos concluídos"
                value={formatNumber(metrics.total_atendimentos)}
                icon={Users}
                trend="up"
                trendValue="Volume saudável"
                variant="info"
              />
            </>
          )}
        </div>

        <Card className="border-blue-100 bg-blue-50/80 shadow-sm">
          <CardHeader className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg">Visão Geral</CardTitle>
              <span className="text-xs uppercase tracking-[0.2em] text-blue-700">
                Operacional
              </span>
            </div>
            <p className="text-sm text-slate-700">
              Métricas adicionais extraídas do endpoint de operações da clínica.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Tempo médio por consulta</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {isLoading ? "--" : formatTime(metrics.tempo_medio_consulta)}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Lotação média</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {isLoading ? "--" : formatPercentage(metrics.lotacao_media)}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Taxa de conversão</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {isLoading ? "--" : formatPercentage(metrics.taxa_conversao)}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Satisfação média</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {isLoading ? "--" : `${metrics.satisfacao_media.toFixed(1)} ⭐`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {/* Financial Breakdown */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 flex items-center gap-2">
            💰 Integração Financeira
          </h3>
          <div className="text-green-700 text-xs mt-3 space-y-2">
            <div className="flex justify-between items-center">
              <span>Faturamento:</span>
              <span className="font-semibold">{formatCurrency(faturamento)}</span>
            </div>
            <div className="border-t border-green-300 pt-2">
              <div className="flex justify-between items-center text-red-700">
                <span>(-) Despesas:</span>
                <span className="font-semibold">{formatCurrency(despesas)}</span>
              </div>
            </div>
            <div className="border-t border-green-300 pt-2 flex justify-between items-center font-bold">
              <span>Lucro Líquido:</span>
              <span className={lucroTotal >= 0 ? "text-green-700" : "text-red-700"}>
                {formatCurrency(lucroTotal)}
              </span>
            </div>
          </div>
          <p className="text-green-600 text-xs mt-3 border-t border-green-300 pt-2">
            ✓ Inclui receitas de agendamentos REALIZADO<br/>
            ✓ Abate despesas manuais contabilizadas<br/>
            ✓ Atualizado mensalmente
          </p>
        </div>

        {/* Performance Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900">💡 Dica de Performance</h3>
          <p className="text-blue-700 text-sm mt-2">
            Sua clínica está acima da média em taxa de conversão. Continue investindo em marketing e na qualidade do atendimento.
          </p>
        </div>

        {/* Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900">⚠️ Atenção</h3>
          <p className="text-amber-700 text-sm mt-2">
            A taxa de no-show está acima do ideal. Considere implementar confirmação de agendamento via SMS.
          </p>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-gray-500 text-xs pt-4 border-t border-gray-200">
        <p>Dados atualizados em {new Date().toLocaleTimeString("pt-BR")}</p>
      </div>
    </div>
  )
}
