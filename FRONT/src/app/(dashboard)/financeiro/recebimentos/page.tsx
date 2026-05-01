"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/hooks/use-auth"
import { computeTelasLiberadas, useMinhasPermissoesRotas } from "@/hooks/use-minhas-permissoes-rotas"
import { apiClient } from "@/services/api-client"
import type { CobrancaConsultaResponse } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MetricCardSkeleton } from "@/components/ui/skeleton"

function mapCobranca(raw: Record<string, unknown>): CobrancaConsultaResponse & { updated_at?: string } {
  const id = raw.id ?? raw.ID
  return {
    id: String(id ?? ""),
    clinica_id: String(raw.clinica_id ?? raw.ClinicaID ?? ""),
    agenda_id: String(raw.agenda_id ?? raw.AgendaID ?? ""),
    valor_bruto: Number(raw.valor_bruto ?? raw.ValorBruto ?? 0),
    percentual_split_snapshot: Number(raw.percentual_split_snapshot ?? raw.PercentualSplitSnapshot ?? 0),
    taxa_sistema_valor: Number(raw.taxa_sistema_valor ?? raw.TaxaSistemaValor ?? 0),
    taxa_gateway_valor: Number(raw.taxa_gateway_valor ?? raw.TaxaGatewayValor ?? 0),
    valor_liquido_clinica: Number(raw.valor_liquido_clinica ?? raw.ValorLiquidoClinica ?? 0),
    status: String(raw.status ?? raw.Status ?? ""),
    metodo: String(raw.metodo ?? raw.Metodo ?? ""),
    valor_recebido:
      raw.valor_recebido == null && raw.ValorRecebido == null
        ? undefined
        : Number(raw.valor_recebido ?? raw.ValorRecebido ?? 0),
    troco:
      raw.troco == null && raw.Troco == null ? undefined : Number(raw.troco ?? raw.Troco ?? 0),
    updated_at: String(raw.updated_at ?? raw.UpdatedAt ?? ""),
  }
}

export default function RecebimentosAsaasPage() {
  const router = useRouter()
  const { usuario, userRole } = useAuth()
  const { data: permRotas, isSuccess: permissoesOk } = useMinhasPermissoesRotas()
  const { podeRelatorioRecebimentos } = useMemo(
    () => computeTelasLiberadas(permissoesOk ? permRotas : undefined, userRole),
    [permRotas, userRole, permissoesOk]
  )

  const [inicio, setInicio] = useState("")
  const [fim, setFim] = useState("")
  const [incluirSemGateway, setIncluirSemGateway] = useState(false)

  const q = useQuery({
    queryKey: ["relatorio-recebimentos", inicio, fim, incluirSemGateway],
    queryFn: async () => {
      const d = await apiClient.getRelatorioRecebimentos(inicio || undefined, fim || undefined, {
        incluirSemGateway,
      })
      const raw = (d.recebimentos ?? []) as Record<string, unknown>[]
      return raw.map(mapCobranca)
    },
    enabled: permissoesOk && podeRelatorioRecebimentos,
  })

  if (!usuario) return null
  if (!permissoesOk || !podeRelatorioRecebimentos) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900">
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-2">Apenas o dono da clínica pode ver o relatório de recebimentos.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recebimentos (Asaas / gateway)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Por padrão mostra só consultas liquidadas pelo Asaas (Pix ou cartão com ID de pagamento). Taxas de gateway e
          sistema refletem essa liquidação. Marque abaixo para incluir dinheiro, confirmação na recepção e Pix/cartão
          registrados só na recepção (sem gateway).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="inicio">Início (aaaa-mm-dd)</Label>
              <Input id="inicio" value={inicio} onChange={(e) => setInicio(e.target.value)} placeholder="2026-01-01" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fim">Fim (aaaa-mm-dd)</Label>
              <Input id="fim" value={fim} onChange={(e) => setFim(e.target.value)} placeholder="2026-12-31" />
            </div>
            <Button type="button" onClick={() => q.refetch()}>
              Aplicar período
            </Button>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={incluirSemGateway}
              onChange={(e) => setIncluirSemGateway(e.target.checked)}
            />
            <span>Incluir recebimentos sem cobrança no Asaas (recepção: dinheiro, manual, Pix/cartão com baixa local)</span>
          </label>
        </CardContent>
      </Card>

      {q.isPending && (
        <div className="space-y-3">
          <MetricCardSkeleton />
        </div>
      )}

      {!q.isPending && (q.data?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-600">
            {incluirSemGateway
              ? "Nenhum recebimento pago no período."
              : "Nenhuma liquidação via Asaas no período. Se houver Pix/cartão só na recepção, marque a opção acima."}
          </CardContent>
        </Card>
      )}

      {!q.isPending && (q.data?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Agenda</th>
                <th className="px-3 py-2">Método</th>
                <th className="px-3 py-2 text-right">Bruto</th>
                <th className="px-3 py-2 text-right">Gateway</th>
                <th className="px-3 py-2 text-right">Sistema (%)</th>
                <th className="px-3 py-2 text-right">Recebido / troco</th>
                <th className="px-3 py-2 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {q.data!.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.updated_at
                      ? (() => {
                          try {
                            return format(parseISO(r.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          } catch {
                            return r.updated_at
                          }
                        })()
                      : "—"}
                  </td>
                  <td className="px-3 py-2">#{r.agenda_id}</td>
                  <td className="px-3 py-2">{r.metodo}</td>
                  <td className="px-3 py-2 text-right">R$ {r.valor_bruto.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">R$ {r.taxa_gateway_valor.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    R$ {r.taxa_sistema_valor.toFixed(2)}{" "}
                    <span className="text-slate-400">({r.percentual_split_snapshot.toFixed(2)}%)</span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {r.metodo === "DINHEIRO" && r.valor_recebido != null ? (
                      <>
                        R$ {r.valor_recebido.toFixed(2)}
                        <br />
                        <span className="text-xs">troco R$ {(r.troco ?? 0).toFixed(2)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">R$ {r.valor_liquido_clinica.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
