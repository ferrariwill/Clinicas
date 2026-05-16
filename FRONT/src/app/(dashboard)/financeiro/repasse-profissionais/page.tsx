"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/hooks/use-auth"
import { computeTelasLiberadas, useMinhasPermissoesRotas } from "@/hooks/use-minhas-permissoes-rotas"
import { apiClient } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { labelEspecialidade } from "@/lib/clinica-especialidade"

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(n) ? n : 0)

function mapLinhaRepasse(raw: Record<string, unknown>) {
  return {
    usuario_id: Number(raw.usuario_id ?? raw.UsuarioID ?? 0),
    nome: String(raw.nome ?? raw.Nome ?? "—"),
    especialidade: String(raw.especialidade ?? raw.Especialidade ?? "").trim(),
    porcentagem_repasse: Number(raw.porcentagem_repasse ?? raw.PorcentagemRepasse ?? 0),
    quantidade_atendimentos: Number(raw.quantidade_atendimentos ?? raw.QuantidadeAtendimentos ?? 0),
    valor_base_total: Number(raw.valor_base_total ?? raw.ValorBaseTotal ?? 0),
    valor_repasse_total: Number(raw.valor_repasse_total ?? raw.ValorRepasseTotal ?? 0),
  }
}

function mapDetalheRepasse(raw: Record<string, unknown>) {
  return {
    cobranca_id: Number(raw.cobranca_id ?? raw.CobrancaID ?? 0),
    agenda_id: Number(raw.agenda_id ?? raw.AgendaID ?? 0),
    usuario_id: Number(raw.usuario_id ?? raw.UsuarioID ?? 0),
    data_hora: String(raw.data_hora ?? raw.DataHora ?? ""),
    paciente_nome: String(raw.paciente_nome ?? raw.PacienteNome ?? "—"),
    valor_base: Number(raw.valor_base ?? raw.ValorBase ?? 0),
    porcentagem_repasse: Number(raw.porcentagem_repasse ?? raw.PorcentagemRepasse ?? 0),
    valor_repasse: Number(raw.valor_repasse ?? raw.ValorRepasse ?? 0),
  }
}

export default function RepasseProfissionaisPage() {
  const router = useRouter()
  const { usuario, userRole } = useAuth()
  const { data: permRotas, isSuccess: permissoesOk } = useMinhasPermissoesRotas()
  const { podeRelatorioRepasseProfissionais } = useMemo(
    () => computeTelasLiberadas(permissoesOk ? permRotas : undefined, userRole),
    [permRotas, userRole, permissoesOk]
  )

  const [inicio, setInicio] = useState("")
  const [fim, setFim] = useState("")
  const [incluirSemGateway, setIncluirSemGateway] = useState(false)

  const q = useQuery({
    queryKey: ["relatorio-repasse-profissionais", inicio, fim, incluirSemGateway],
    queryFn: async () => {
      const d = await apiClient.getRelatorioRepasseProfissionais(inicio || undefined, fim || undefined, {
        incluirSemGateway,
      })
      const linhas = (d.por_profissional ?? []) as Record<string, unknown>[]
      const detalhes = (d.detalhes ?? []) as Record<string, unknown>[]
      return {
        linhas: linhas.map(mapLinhaRepasse),
        detalhes: detalhes.map(mapDetalheRepasse),
      }
    },
    enabled: permissoesOk && podeRelatorioRepasseProfissionais,
  })

  const totalRepasse = useMemo(() => {
    const L = q.data?.linhas ?? []
    return L.reduce((s, r) => s + r.valor_repasse_total, 0)
  }, [q.data?.linhas])

  if (!usuario) return null
  if (!permissoesOk || !podeRelatorioRepasseProfissionais) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900">
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-2">Apenas o dono da clínica (ou perfil com permissão do relatório) pode ver o repasse.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Repasse aos profissionais</h1>
        <p className="mt-1 text-sm text-slate-600">
          Considera as mesmas cobranças pagas do relatório de recebimentos: por padrão só liquidações com ID no Asaas.
          Marque a opção abaixo para incluir dinheiro, manual e baixa só na recepção. O valor do repasse é a
          porcentagem cadastrada na equipe aplicada sobre o <strong>valor bruto</strong> de cada consulta paga, pelo
          profissional vinculado ao agendamento.
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
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      )}

      {q.isError && (
        <p className="text-sm text-rose-700">{(q.error as Error)?.message ?? "Erro ao carregar relatório."}</p>
      )}

      {q.isSuccess && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo por profissional</CardTitle>
              <p className="text-sm text-slate-600">
                Total geral a pagar no período: <span className="font-semibold text-slate-900">{brl(totalRepasse)}</span>
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {!q.data.linhas.length ? (
                <p className="text-sm text-slate-500">Nenhuma consulta paga no período filtrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="hidden sm:table-cell">Especialidade</TableHead>
                      <TableHead className="text-right">% repasse</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                      <TableHead className="text-right">Base (bruto)</TableHead>
                      <TableHead className="text-right">A pagar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {q.data.linhas.map((r) => (
                      <TableRow key={r.usuario_id}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="hidden sm:table-cell text-slate-600">
                          {r.especialidade ? labelEspecialidade(r.especialidade) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.porcentagem_repasse.toFixed(2)}%</TableCell>
                        <TableCell className="text-right tabular-nums">{r.quantidade_atendimentos}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(r.valor_base_total)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{brl(r.valor_repasse_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por atendimento pago</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {!q.data.detalhes.length ? (
                <p className="text-sm text-slate-500">Sem linhas de detalhe.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="hidden md:table-cell">Cobrança</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Repasse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {q.data.detalhes.map((d) => {
                      let dataFmt = d.data_hora
                      try {
                        if (d.data_hora) dataFmt = format(parseISO(d.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      } catch {
                        /* keep raw */
                      }
                      return (
                        <TableRow key={`${d.cobranca_id}-${d.agenda_id}`}>
                          <TableCell className="whitespace-nowrap text-sm">{dataFmt}</TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm">{d.paciente_nome}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-slate-500">#{d.cobranca_id}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{brl(d.valor_base)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{d.porcentagem_repasse.toFixed(2)}%</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{brl(d.valor_repasse)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
