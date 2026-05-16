"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/hooks/use-auth"
import { computeTelasLiberadas, useMinhasPermissoesRotas } from "@/hooks/use-minhas-permissoes-rotas"
import {
  useFechamentoPreview,
  useFechamentosFinanceirosList,
  useFechamentoFinanceiroDetalhe,
  useCriarFechamentoFinanceiro,
} from "@/hooks/use-financeiro"
import type { FechamentoDetalhamentoPayload, FechamentoListaItem } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2 } from "lucide-react"

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)

function parseDetalhamento(raw: unknown): FechamentoDetalhamentoPayload | null {
  if (raw == null) return null
  let o: Record<string, unknown>
  if (typeof raw === "string") {
    try {
      o = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return null
    }
  } else if (typeof raw === "object") {
    o = raw as Record<string, unknown>
  } else {
    return null
  }
  return {
    lancamentos: Array.isArray(o.lancamentos) ? (o.lancamentos as FechamentoDetalhamentoPayload["lancamentos"]) : [],
    repasse_linhas: Array.isArray(o.repasse_linhas)
      ? (o.repasse_linhas as FechamentoDetalhamentoPayload["repasse_linhas"])
      : [],
    repasse_detalhes: Array.isArray(o.repasse_detalhes)
      ? (o.repasse_detalhes as FechamentoDetalhamentoPayload["repasse_detalhes"])
      : [],
  }
}

export default function NovoFechamentoFinanceiroPage() {
  const router = useRouter()
  const { userRole } = useAuth()
  const { data: permRotas, isSuccess: permissoesOk } = useMinhasPermissoesRotas()
  const { podeFinanceiro } = useMemo(
    () => computeTelasLiberadas(permissoesOk ? permRotas : undefined, userRole),
    [permRotas, userRole, permissoesOk]
  )

  const [inicio, setInicio] = useState("")
  const [fim, setFim] = useState("")
  const [detalheId, setDetalheId] = useState<string | null>(null)

  useEffect(() => {
    if (!permissoesOk) return
    if (!podeFinanceiro) router.replace("/agenda")
  }, [permissoesOk, podeFinanceiro, router])

  const previewEnabled = Boolean(inicio && fim && inicio <= fim)
  const { data: preview, isFetching: loadingPreview, isError: previewErro } = useFechamentoPreview(
    inicio,
    fim,
    Boolean(permissoesOk && podeFinanceiro)
  )
  const { data: lista, isLoading: loadingLista, refetch: refetchLista } = useFechamentosFinanceirosList(
    Boolean(permissoesOk && podeFinanceiro)
  )
  const { data: detalheApi, isLoading: loadingDetalhe } = useFechamentoFinanceiroDetalhe(
    detalheId,
    Boolean(detalheId)
  )
  const criar = useCriarFechamentoFinanceiro()

  const detalhamentoPreview = useMemo(() => {
    if (!preview?.detalhamento) return null
    return parseDetalhamento(preview.detalhamento)
  }, [preview])

  const detalhamentoSalvo = useMemo(() => {
    if (!detalheApi) return null
    const raw = (detalheApi as { detalhamento_json?: unknown }).detalhamento_json
    return parseDetalhamento(raw)
  }, [detalheApi])

  const handleConfirmar = () => {
    if (!previewEnabled) return
    criar.mutate(
      { dataInicio: inicio, dataFim: fim },
      {
        onSuccess: () => {
          void refetchLista()
        },
      }
    )
  }

  const abrirDetalhe = (item: FechamentoListaItem) => {
    setDetalheId(String(item.id))
  }

  if (!permissoesOk || !podeFinanceiro) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/financeiro"
            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar ao financeiro
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Novo fechamento</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Selecione o período, confira o resumo e salve. Lançamentos incluídos ficam bloqueados para edição após o
            fechamento.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Período</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dt-ini">Data início</Label>
            <Input id="dt-ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-fim">Data fim</Label>
            <Input id="dt-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {inicio && fim && inicio > fim && (
        <p className="text-sm text-amber-800 dark:text-amber-200">A data fim deve ser igual ou posterior à data início.</p>
      )}

      {previewEnabled && (
        <Card className="border-sky-100 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Resumo do que será fechado</CardTitle>
            {loadingPreview && <Loader2 className="h-5 w-5 animate-spin text-sky-700" aria-hidden />}
          </CardHeader>
          <CardContent className="space-y-4">
            {previewErro && (
              <p className="text-sm text-rose-700">Não foi possível calcular o preview. Verifique as datas e tente de novo.</p>
            )}
            {preview && !previewErro && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Lançamentos livres</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {preview.quantidade_lancamentos}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Itens de repasse</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {preview.quantidade_itens_repasse}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Entradas</p>
                    <p className="mt-1 text-xl font-semibold text-emerald-800 dark:text-emerald-300">
                      {formatBRL(preview.total_entradas)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Saídas (lanç.)</p>
                    <p className="mt-1 text-xl font-semibold text-rose-800 dark:text-rose-300">
                      {formatBRL(preview.total_saidas)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900/60">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Repasses (período)</p>
                    <p className="text-lg font-semibold text-amber-900 dark:text-amber-200">
                      {formatBRL(preview.total_repasses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Lucro líquido estimado</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
                      {formatBRL(preview.lucro_liquido)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Entradas − saídas de lançamentos − repasses.</p>
                  </div>
                </div>

                {detalhamentoPreview && detalhamentoPreview.lancamentos.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Lançamentos incluídos</h3>
                    <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalhamentoPreview.lancamentos.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="whitespace-nowrap text-xs">{l.data}</TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs">{l.descricao}</TableCell>
                              <TableCell className="text-xs">{l.tipo}</TableCell>
                              <TableCell className="text-right text-xs font-medium">{formatBRL(l.valor)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!preview || loadingPreview || criar.isPending || previewErro}
              onClick={handleConfirmar}
            >
              {criar.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Salvando…
                </>
              ) : (
                "Confirmar e salvar fechamento"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fechamentos anteriores</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Clique em uma linha para ver o detalhamento gravado no banco (lançamentos e repasses daquele fechamento).
          </p>
        </CardHeader>
        <CardContent>
          {loadingLista ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
            </div>
          ) : !lista?.length ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum fechamento registrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Repasses</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      onClick={() => abrirDetalhe(row)}
                    >
                      <TableCell className="font-medium">
                        {row.data_inicio} → {row.data_fim}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {(() => {
                          try {
                            return format(parseISO(row.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          } catch {
                            return row.criado_em
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatBRL(row.total_entradas)}</TableCell>
                      <TableCell className="text-right text-sm">{formatBRL(row.total_saidas)}</TableCell>
                      <TableCell className="text-right text-sm">{formatBRL(row.total_repasses)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatBRL(row.lucro_liquido)}</TableCell>
                      <TableCell className="text-xs">{row.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(detalheId)} onOpenChange={(o) => !o && setDetalheId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogTitle className="pr-10">Detalhamento do fechamento</DialogTitle>
          {loadingDetalhe && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
            </div>
          )}
          {!loadingDetalhe && detalheApi && (
            <div className="space-y-4 text-sm">
              <p>
                <span className="font-medium text-slate-700 dark:text-slate-300">Período:</span>{" "}
                {detalheApi.data_inicio} — {detalheApi.data_fim}
              </p>
              <div className="grid gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Entradas</p>
                  <p className="font-semibold">{formatBRL(detalheApi.total_entradas)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Saídas</p>
                  <p className="font-semibold">{formatBRL(detalheApi.total_saidas)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Repasses</p>
                  <p className="font-semibold">{formatBRL(detalheApi.total_repasses)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Lucro líquido</p>
                  <p className="font-semibold">{formatBRL(detalheApi.lucro_liquido)}</p>
                </div>
              </div>

              {detalhamentoSalvo && (
                <>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Lançamentos (snapshot)</h4>
                  {detalhamentoSalvo.lancamentos.length === 0 ? (
                    <p className="text-slate-500">Nenhum lançamento livre no período.</p>
                  ) : (
                    <div className="max-h-48 overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-right text-xs">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalhamentoSalvo.lancamentos.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs">{l.data}</TableCell>
                              <TableCell className="max-w-xs truncate text-xs">{l.descricao}</TableCell>
                              <TableCell className="text-xs">{l.tipo}</TableCell>
                              <TableCell className="text-right text-xs">{formatBRL(l.valor)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Repasse por profissional</h4>
                  {detalhamentoSalvo.repasse_linhas.length === 0 ? (
                    <p className="text-slate-500">Sem linhas de repasse no período.</p>
                  ) : (
                    <div className="max-h-40 overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Profissional</TableHead>
                            <TableHead className="text-xs">%</TableHead>
                            <TableHead className="text-right text-xs">Base</TableHead>
                            <TableHead className="text-right text-xs">Repasse</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalhamentoSalvo.repasse_linhas.map((r) => (
                            <TableRow key={r.usuario_id}>
                              <TableCell className="text-xs">{r.nome}</TableCell>
                              <TableCell className="text-xs">{r.porcentagem_repasse}%</TableCell>
                              <TableCell className="text-right text-xs">{formatBRL(r.valor_base_total)}</TableCell>
                              <TableCell className="text-right text-xs">{formatBRL(r.valor_repasse_total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Detalhe das cobranças (repasse)</h4>
                  {detalhamentoSalvo.repasse_detalhes.length === 0 ? (
                    <p className="text-slate-500">Sem itens.</p>
                  ) : (
                    <div className="max-h-56 overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Paciente</TableHead>
                            <TableHead className="text-xs">Data/hora</TableHead>
                            <TableHead className="text-right text-xs">Base</TableHead>
                            <TableHead className="text-right text-xs">Repasse</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalhamentoSalvo.repasse_detalhes.map((d, idx) => (
                            <TableRow key={`${d.cobranca_id}-${idx}`}>
                              <TableCell className="max-w-[140px] truncate text-xs">{d.paciente_nome}</TableCell>
                              <TableCell className="whitespace-nowrap text-xs">{d.data_hora}</TableCell>
                              <TableCell className="text-right text-xs">{formatBRL(d.valor_base)}</TableCell>
                              <TableCell className="text-right text-xs">{formatBRL(d.valor_repasse)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
