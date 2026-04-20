"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/hooks/use-auth"
import {
  useLancamentosFinanceiros,
  useResumoFinanceiro,
  useCriarLancamento,
  useCustosFixos,
  useCriarCustoFixo,
  useAtualizarCustoFixo,
} from "@/hooks/use-financeiro"
import { LancamentoFinanceiro, FiltrosFinanceiro, ResumoFinanceiro, CustoFixo } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  EyeOff,
  Building2,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import {
  maskDataBR,
  maskMoedaBRL,
  dataBRToISO,
  dataISOToBR,
  parseMoedaBRL,
  digitsOnly,
} from "@/lib/utils/masks"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const canViewFullFinancials = (userType: string, userRole?: string | null) => {
  const r = userRole ?? ""
  if (r === "DONO") return true
  return ["DONO", "DONO_CLINICA", "ADM_GERAL"].includes(userType)
}

const canViewLancamento = (
  lancamento: LancamentoFinanceiro,
  userId: string,
  userType: string,
  role?: string | null
) => {
  if (canViewFullFinancials(userType, role)) return true
  return lancamento.usuario_id === userId
}

export default function FinanceiroPage() {
  const { usuario, userRole } = useAuth()
  const [openDialog, setOpenDialog] = useState(false)
  const [openCustoFixo, setOpenCustoFixo] = useState(false)
  const [editCusto, setEditCusto] = useState<CustoFixo | null>(null)
  const [novoCusto, setNovoCusto] = useState({ descricao: "", valor: "" })
  const [editForm, setEditForm] = useState({ descricao: "", valor: "", ativo: true })
  const [filtros, setFiltros] = useState<FiltrosFinanceiro>({})
  const [filtroInicioBR, setFiltroInicioBR] = useState("")
  const [filtroFimBR, setFiltroFimBR] = useState("")
  const [dataLancBR, setDataLancBR] = useState("")
  const [newLancamento, setNewLancamento] = useState({
    descricao: '',
    valor: '',
    tipo: 'RECEITA' as 'RECEITA' | 'DESPESA',
    categoria: 'PARTICULAR' as 'PARTICULAR' | 'CONVENIO',
    data: format(new Date(), 'yyyy-MM-dd')
  })

  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentosFinanceiros(filtros)
  const { data: resumo, isLoading: loadingResumo } = useResumoFinanceiro(filtros.dataInicio, filtros.dataFim)
  const { data: custosFixos, isLoading: loadingCustosFixos } = useCustosFixos()
  const criarLancamento = useCriarLancamento()
  const criarCustoFixo = useCriarCustoFixo()
  const atualizarCustoFixo = useAtualizarCustoFixo()

  useEffect(() => {
    setFiltroInicioBR(filtros.dataInicio ? dataISOToBR(filtros.dataInicio) : "")
  }, [filtros.dataInicio])

  useEffect(() => {
    setFiltroFimBR(filtros.dataFim ? dataISOToBR(filtros.dataFim) : "")
  }, [filtros.dataFim])

  useEffect(() => {
    if (openDialog) {
      setDataLancBR(dataISOToBR(newLancamento.data))
    }
  }, [openDialog, newLancamento.data])

  const lancamentosTyped = (lancamentos ?? []) as LancamentoFinanceiro[]

  // Filtrar lançamentos baseado nas permissões
  const lancamentosFiltrados = lancamentosTyped.filter((lancamento: LancamentoFinanceiro) =>
    canViewLancamento(lancamento, usuario?.id || "", usuario?.tipo_usuario || "", userRole)
  )

  const podeVerTudo = canViewFullFinancials(usuario?.tipo_usuario || "", userRole)
  const resumoTyped = (resumo ?? {}) as ResumoFinanceiro

  // Calcular totais visíveis baseado nas permissões
  const totaisVisiveis: {
    totalEntradas: number
    totalSaidas: number
    saldoLiquido: number
    totalSaidasLancamentos?: number
    custosFixosNoPeriodo?: number
    custosFixosMensal?: number
    mesesNoPeriodo?: number
  } = podeVerTudo
    ? {
        totalEntradas: resumoTyped.totalEntradas ?? 0,
        totalSaidasLancamentos: resumoTyped.totalSaidasLancamentos ?? resumoTyped.totalSaidas ?? 0,
        custosFixosMensal: resumoTyped.custosFixosMensal ?? 0,
        custosFixosNoPeriodo: resumoTyped.custosFixosNoPeriodo ?? 0,
        mesesNoPeriodo: resumoTyped.mesesNoPeriodo ?? 1,
        totalSaidas: resumoTyped.totalSaidas ?? 0,
        saldoLiquido: resumoTyped.saldoLiquido ?? 0,
      }
    : {
        totalEntradas: lancamentosFiltrados
          .filter((l: LancamentoFinanceiro) => l.tipo === "RECEITA")
          .reduce((sum: number, l: LancamentoFinanceiro) => sum + l.valor, 0),
        totalSaidas: lancamentosFiltrados
          .filter((l: LancamentoFinanceiro) => l.tipo === "DESPESA")
          .reduce((sum: number, l: LancamentoFinanceiro) => sum + l.valor, 0),
        saldoLiquido: 0,
      }

  const handleCreateLancamento = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newLancamento.descricao || !newLancamento.valor) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    const valor = parseMoedaBRL(newLancamento.valor)
    if (Number.isNaN(valor) || valor <= 0) {
      toast.error("Valor deve ser um número positivo")
      return
    }

    const dataIso = dataBRToISO(dataLancBR.trim()) || newLancamento.data
    if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) {
      toast.error("Informe a data do lançamento como dd/mm/aaaa")
      return
    }

    await criarLancamento.mutateAsync({
      ...newLancamento,
      valor,
      data: dataIso,
    })

    setNewLancamento({
      descricao: '',
      valor: '',
      tipo: 'RECEITA',
      categoria: 'PARTICULAR',
      data: format(new Date(), 'yyyy-MM-dd')
    })
    setOpenDialog(false)
  }

  const handleCriarCustoFixo = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = parseMoedaBRL(novoCusto.valor)
    if (!novoCusto.descricao.trim() || Number.isNaN(v) || v <= 0) {
      toast.error("Preencha descrição e valor mensal válidos")
      return
    }
    await criarCustoFixo.mutateAsync({ descricao: novoCusto.descricao.trim(), valor_mensal: v })
    setNovoCusto({ descricao: "", valor: "" })
    setOpenCustoFixo(false)
  }

  const abrirEdicaoCusto = (c: CustoFixo) => {
    setEditCusto(c)
    setEditForm({
      descricao: c.descricao,
      valor: maskMoedaBRL(String(Math.round(c.valor_mensal * 100))),
      ativo: c.ativo,
    })
  }

  const handleSalvarEdicaoCusto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCusto) return
    const v = parseMoedaBRL(editForm.valor)
    if (!editForm.descricao.trim() || Number.isNaN(v) || v <= 0) {
      toast.error("Preencha descrição e valor válidos")
      return
    }
    await atualizarCustoFixo.mutateAsync({
      id: editCusto.id,
      data: { descricao: editForm.descricao.trim(), valor_mensal: v, ativo: editForm.ativo },
    })
    setEditCusto(null)
  }

  const handleFilterChange = (key: keyof FiltrosFinanceiro, value: string) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  return (
    <div className="mx-auto w-full max-w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Gestão Financeira</h1>
          <p className="mt-2 text-sm text-slate-600">
            Controle o fluxo de caixa, custos fixos mensais e lançamentos da clínica
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="outline" className="inline-flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto">
            <Download className="h-4 w-4" />
            Exportar Relatório
          </Button>

          {podeVerTudo && (
            <Dialog open={openCustoFixo} onOpenChange={setOpenCustoFixo}>
              <DialogTrigger asChild>
                <Button variant="outline" className="inline-flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto">
                  <Building2 className="h-4 w-4" />
                  Novo custo fixo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogTitle>Custo fixo mensal</DialogTitle>
                <DialogDescription>Ex.: aluguel, internet, software, contador.</DialogDescription>
                <form onSubmit={handleCriarCustoFixo} className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="cf-desc">Descrição</Label>
                    <Input
                      id="cf-desc"
                      value={novoCusto.descricao}
                      onChange={(e) => setNovoCusto((p) => ({ ...p, descricao: e.target.value }))}
                      placeholder="Aluguel da sala"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cf-val">Valor mensal (R$)</Label>
                    <Input
                      id="cf-val"
                      inputMode="decimal"
                      value={novoCusto.valor}
                      onChange={(e) => setNovoCusto((p) => ({ ...p, valor: maskMoedaBRL(e.target.value) }))}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setOpenCustoFixo(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={criarCustoFixo.isPending}>
                      {criarCustoFixo.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="inline-flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
              <DialogDescription>
                Registre uma receita ou despesa avulsa no sistema financeiro.
              </DialogDescription>

              <form onSubmit={handleCreateLancamento} className="space-y-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={newLancamento.tipo}
                    onValueChange={(value: 'RECEITA' | 'DESPESA') =>
                      setNewLancamento(prev => ({ ...prev, tipo: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEITA">Receita</SelectItem>
                      <SelectItem value="DESPESA">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={newLancamento.categoria}
                    onValueChange={(value: 'PARTICULAR' | 'CONVENIO') =>
                      setNewLancamento(prev => ({ ...prev, categoria: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PARTICULAR">Particular</SelectItem>
                      <SelectItem value="CONVENIO">Convênio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={newLancamento.descricao}
                    onChange={(e) => setNewLancamento(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Ex: Consulta particular, Aluguel, etc."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    inputMode="decimal"
                    value={newLancamento.valor}
                    onChange={(e) =>
                      setNewLancamento((prev) => ({
                        ...prev,
                        valor: maskMoedaBRL(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    value={dataLancBR}
                    onChange={(e) => {
                      const br = maskDataBR(e.target.value)
                      setDataLancBR(br)
                      const iso = dataBRToISO(br)
                      if (iso) setNewLancamento((prev) => ({ ...prev, data: iso }))
                    }}
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setOpenDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={criarLancamento.isPending}>
                    {criarLancamento.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div
        className={`grid gap-4 ${podeVerTudo ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        {loadingResumo ? (
          Array.from({ length: podeVerTudo ? 4 : 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card className="min-w-0 border-green-100 bg-green-50/80">
              <CardContent className="p-5 sm:p-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-full bg-green-100 p-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">Total de Entradas</p>
                    <p className="truncate text-xl font-semibold text-green-700 sm:text-2xl">
                      {podeVerTudo ? (
                        formatCurrency(totaisVisiveis?.totalEntradas || 0)
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-4 w-4 shrink-0" />
                          Restrito
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-red-100 bg-red-50/80">
              <CardContent className="p-5 sm:p-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-full bg-red-100 p-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">
                      {podeVerTudo ? "Saídas (lançamentos)" : "Total de Saídas"}
                    </p>
                    <p className="truncate text-xl font-semibold text-red-700 sm:text-2xl">
                      {podeVerTudo ? (
                        formatCurrency(totaisVisiveis?.totalSaidasLancamentos ?? 0)
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-4 w-4 shrink-0" />
                          Restrito
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {podeVerTudo && (
              <Card className="min-w-0 border-amber-100 bg-amber-50/80">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded-full bg-amber-100 p-2">
                      <Building2 className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-500">Custos fixos (período)</p>
                      <p className="truncate text-xl font-semibold text-amber-900 sm:text-2xl">
                        {formatCurrency(totaisVisiveis?.custosFixosNoPeriodo ?? 0)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Base mensal {formatCurrency(totaisVisiveis?.custosFixosMensal ?? 0)} ×{" "}
                        {totaisVisiveis?.mesesNoPeriodo ?? 1} mes(es)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="min-w-0 border-blue-100 bg-blue-50/80">
              <CardContent className="p-5 sm:p-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-full bg-blue-100 p-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">Saldo Líquido</p>
                    <p
                      className={`truncate text-xl font-semibold sm:text-2xl ${
                        (totaisVisiveis?.saldoLiquido || 0) >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {podeVerTudo ? (
                        formatCurrency(totaisVisiveis?.saldoLiquido || 0)
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-4 w-4 shrink-0" />
                          Restrito
                        </span>
                      )}
                    </p>
                    {podeVerTudo && (
                      <p className="mt-1 text-xs text-slate-600">
                        Inclui lançamentos + custos fixos no período (total saídas{" "}
                        {formatCurrency(totaisVisiveis?.totalSaidas || 0)})
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={filtroInicioBR}
                onChange={(e) => {
                  const br = maskDataBR(e.target.value)
                  setFiltroInicioBR(br)
                  if (digitsOnly(br).length === 0) {
                    handleFilterChange("dataInicio", "")
                    return
                  }
                  const iso = dataBRToISO(br)
                  if (iso) handleFilterChange("dataInicio", iso)
                }}
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={filtroFimBR}
                onChange={(e) => {
                  const br = maskDataBR(e.target.value)
                  setFiltroFimBR(br)
                  if (digitsOnly(br).length === 0) {
                    handleFilterChange("dataFim", "")
                    return
                  }
                  const iso = dataBRToISO(br)
                  if (iso) handleFilterChange("dataFim", iso)
                }}
              />
            </div>
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={filtros.categoria ?? "__all__"}
                onValueChange={(value) =>
                  setFiltros((prev) => ({
                    ...prev,
                    categoria: value === "__all__" ? undefined : (value as "PARTICULAR" | "CONVENIO"),
                  }))
                }
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as categorias</SelectItem>
                  <SelectItem value="PARTICULAR">Particular</SelectItem>
                  <SelectItem value="CONVENIO">Convênio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {podeVerTudo && (
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Building2 className="h-5 w-5 shrink-0" />
              Custos fixos mensais
            </CardTitle>
            <p className="text-sm text-slate-600">
              Valores recorrentes (aluguel, internet, etc.) entram automaticamente no resumo e no saldo do período
              filtrado.
            </p>
          </CardHeader>
          <CardContent>
            {loadingCustosFixos ? (
              <MetricCardSkeleton />
            ) : (custosFixos ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum custo fixo cadastrado. Use &quot;Novo custo fixo&quot;.</p>
            ) : (
              <div className="w-full min-w-0 overflow-x-auto rounded-md border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor mensal</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(custosFixos ?? []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">{c.descricao}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatCurrency(c.valor_mensal)}
                        </TableCell>
                        <TableCell>{c.ativo ? "Sim" : "Não"}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="ghost" size="sm" onClick={() => abrirEdicaoCusto(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabela de Lançamentos */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLancamentos ? (
            <div className="space-y-3">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          ) : lancamentosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">Nenhum lançamento encontrado</p>
              <p className="text-sm mt-1">
                {Object.keys(filtros).some(key => filtros[key as keyof FiltrosFinanceiro])
                  ? "Tente ajustar os filtros para ver mais resultados."
                  : "Comece registrando seu primeiro lançamento financeiro."
                }
              </p>
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto rounded-md border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosFiltrados.map((lancamento: LancamentoFinanceiro) => (
                  <TableRow key={lancamento.id}>
                    <TableCell>
                      {format(parseISO(lancamento.data), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{lancamento.descricao}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        lancamento.tipo === 'RECEITA'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {lancamento.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        lancamento.categoria === 'PARTICULAR'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {lancamento.categoria === 'PARTICULAR' ? 'Particular' : 'Convênio'}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      lancamento.tipo === 'RECEITA' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {lancamento.tipo === 'RECEITA' ? '+' : '-'}
                      {formatCurrency(lancamento.valor)}
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editCusto} onOpenChange={(o) => !o && setEditCusto(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Editar custo fixo</DialogTitle>
          <DialogDescription>Altere o valor mensal ou desative o item.</DialogDescription>
          {editCusto && (
            <form onSubmit={handleSalvarEdicaoCusto} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="ed-desc">Descrição</Label>
                <Input
                  id="ed-desc"
                  value={editForm.descricao}
                  onChange={(e) => setEditForm((p) => ({ ...p, descricao: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ed-val">Valor mensal (R$)</Label>
                <Input
                  id="ed-val"
                  inputMode="decimal"
                  value={editForm.valor}
                  onChange={(e) => setEditForm((p) => ({ ...p, valor: maskMoedaBRL(e.target.value) }))}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ed-ativo"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={editForm.ativo}
                  onChange={(e) => setEditForm((p) => ({ ...p, ativo: e.target.checked }))}
                />
                <Label htmlFor="ed-ativo" className="font-normal cursor-pointer">
                  Custo ativo (entra no resumo)
                </Label>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setEditCusto(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={atualizarCustoFixo.isPending}>
                  {atualizarCustoFixo.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}