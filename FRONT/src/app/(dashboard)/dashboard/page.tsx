"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import {
  computeTelasLiberadas,
  useMinhasPermissoesRotas,
} from "@/hooks/use-minhas-permissoes-rotas"
import { useDashboardMetrics, useResumoFinanceiroMes } from "@/hooks/use-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClinicaSelector } from "@/components/clinica-selector"
import MetricCard from "@/components/metric-card"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatPercentage, formatTime, formatNumber } from "@/lib/utils/formatters"
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
 * Resultado no caixa do mês vem do resumo financeiro (entradas − saídas, incluindo custos fixos quando a API enviar).
 * O faturamento da agenda é só a soma de agendamentos realizados (métrica operacional).
 */
export default function DashboardOperacionalPage() {
  const router = useRouter()
  const { usuario, clinicaId, userRole } = useAuth()
  const isMedico = (userRole ?? "").toUpperCase() === "MEDICO"
  const { data: permRotas, isSuccess: permissoesOk } = useMinhasPermissoesRotas()
  const [selectedClinicaId, setSelectedClinicaId] = useState<string | undefined>(clinicaId ?? undefined)
  const { podeDashboard } = useMemo(
    () => computeTelasLiberadas(permissoesOk ? permRotas : undefined, userRole),
    [permRotas, userRole, permissoesOk]
  )

  useEffect(() => {
    if (!permissoesOk) return
    if (!podeDashboard) {
      router.replace("/agenda")
    }
  }, [permissoesOk, podeDashboard, router])

  useEffect(() => {
    if (!selectedClinicaId && clinicaId) {
      setSelectedClinicaId(clinicaId)
    }
  }, [clinicaId, selectedClinicaId])

  const { data, isLoading, isError, error, refetch } = useDashboardMetrics(
    selectedClinicaId
  )
  const { data: resumoFinanceiro, isLoading: loadingFinanceiro } = useResumoFinanceiroMes(
    isMedico ? undefined : selectedClinicaId
  )

  const handleClinicaChange = (novaClinicaId: string) => {
    setSelectedClinicaId(novaClinicaId)
  }

  const faturamento =
    (data?.faturamento ?? data?.faturamento_mensal ?? 0) as number
  const despesas = isMedico ? 0 : (resumoFinanceiro?.totalSaidas ?? 0)
  const entradasFinanceiro = isMedico ? 0 : (resumoFinanceiro?.totalEntradas ?? 0)
  /** Saldo do módulo financeiro no período (não misturar com `||` sobre zero). */
  const saldoFinanceiro = isMedico ? 0 : (resumoFinanceiro?.saldoLiquido ?? 0)
  /** Resultado do mês alinhado ao caixa; se o resumo falhar, aproxima por faturamento da agenda − saídas. */
  const lucroTotal = isMedico
    ? 0
    : resumoFinanceiro != null
      ? saldoFinanceiro
      : faturamento - despesas

  const noShowPct =
    (data?.taxa_no_show_percentual ?? data?.no_show_taxa ?? 0) as number
  const totalAtendimentos =
    (data?.agendamentos_considerados ??
      data?.total_atendimentos ??
      0) as number

  const metrics = {
    faturamento_mensal: faturamento,
    no_show_taxa: noShowPct,
    total_atendimentos: totalAtendimentos,
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
          <p className="text-gray-600 text-sm">
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
          {isLoading || (!isMedico && loadingFinanceiro) ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              {!isMedico && (
                <MetricCard
                  title="Faturamento Mensal"
                  description="Arrecadação do mês"
                  value={formatCurrency(metrics.faturamento_mensal)}
                  icon={TrendingUp}
                  trend="up"
                  trendValue="Receitas de agendamentos realizados"
                  variant="success"
                />
              )}

              {!isMedico && (
                <MetricCard
                  title="Lucro Líquido"
                  description="Saldo do mês (módulo financeiro)"
                  value={formatCurrency(lucroTotal)}
                  icon={DollarSign}
                  trend={lucroTotal > 0 ? "up" : "down"}
                  trendValue={lucroTotal > 0 ? "Resultado positivo" : "Resultado negativo"}
                  variant={lucroTotal > 0 ? "success" : "warning"}
                />
              )}

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
        {!isMedico && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 flex items-center gap-2">
              💰 Integração Financeira
            </h3>
            <div className="text-green-700 text-xs mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span>Faturamento (agenda realizada):</span>
                <span className="font-semibold">{formatCurrency(faturamento)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-green-200 pt-2">
                <span>Entradas (caixa no período):</span>
                <span className="font-semibold">{formatCurrency(entradasFinanceiro)}</span>
              </div>
              <div className="border-t border-green-300 pt-2">
                <div className="flex justify-between items-center text-red-700">
                  <span>(-) Saídas (período):</span>
                  <span className="font-semibold">{formatCurrency(despesas)}</span>
                </div>
              </div>
              <div className="border-t border-green-300 pt-2 flex justify-between items-center font-bold">
                <span>Lucro líquido (saldo):</span>
                <span className={lucroTotal >= 0 ? "text-green-700" : "text-red-700"}>
                  {formatCurrency(lucroTotal)}
                </span>
              </div>
            </div>
            <p className="text-green-600 text-xs mt-3 border-t border-green-300 pt-2">
              O saldo usa o mesmo cálculo do módulo financeiro (entradas − saídas). O faturamento da agenda é referência operacional dos atendimentos realizados.
            </p>
          </div>
        )}

        {isMedico && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 md:col-span-1">
            <h3 className="font-semibold text-slate-900">Visão do profissional</h3>
            <p className="text-slate-600 text-sm mt-2">
              Valores financeiros e integração de caixa ficam restritos ao dono da clínica. Aqui você acompanha volume de
              atendimentos e indicadores operacionais.
            </p>
          </div>
        )}

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
