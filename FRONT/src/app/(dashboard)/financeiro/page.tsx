"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/hooks/use-auth"
import { useLancamentosFinanceiros, useResumoFinanceiro, useCriarLancamento } from "@/hooks/use-financeiro"
import { LancamentoFinanceiro, FiltrosFinanceiro } from "@/types/api"
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
  Calendar,
  Filter,
  Eye,
  EyeOff
} from "lucide-react"
import { toast } from "sonner"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const canViewFullFinancials = (userType: string) => {
  return ['DONO_CLINICA', 'ADM_GERAL'].includes(userType)
}

const canViewLancamento = (lancamento: LancamentoFinanceiro, userId: string, userType: string) => {
  if (canViewFullFinancials(userType)) return true
  return lancamento.usuario_id === userId
}

export default function FinanceiroPage() {
  const { usuario } = useAuth()
  const [openDialog, setOpenDialog] = useState(false)
  const [filtros, setFiltros] = useState<FiltrosFinanceiro>({})
  const [newLancamento, setNewLancamento] = useState({
    descricao: '',
    valor: '',
    tipo: 'RECEITA' as 'RECEITA' | 'DESPESA',
    categoria: 'PARTICULAR' as 'PARTICULAR' | 'CONVENIO',
    data: format(new Date(), 'yyyy-MM-dd')
  })

  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentosFinanceiros(filtros)
  const { data: resumo, isLoading: loadingResumo } = useResumoFinanceiro(filtros.dataInicio, filtros.dataFim)
  const criarLancamento = useCriarLancamento()

  // Filtrar lançamentos baseado nas permissões
  const lancamentosFiltrados = lancamentos?.filter((lancamento: LancamentoFinanceiro) =>
    canViewLancamento(lancamento, usuario?.id || '', usuario?.tipo_usuario || '')
  ) || []

  // Calcular totais visíveis baseado nas permissões
  const totaisVisiveis = canViewFullFinancials(usuario?.tipo_usuario || '')
    ? resumo
    : {
        totalEntradas: lancamentosFiltrados
          .filter((l: LancamentoFinanceiro) => l.tipo === 'RECEITA')
          .reduce((sum: number, l: LancamentoFinanceiro) => sum + l.valor, 0),
        totalSaidas: lancamentosFiltrados
          .filter((l: LancamentoFinanceiro) => l.tipo === 'DESPESA')
          .reduce((sum: number, l: LancamentoFinanceiro) => sum + l.valor, 0),
        saldoLiquido: 0
      }

  const handleCreateLancamento = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newLancamento.descricao || !newLancamento.valor) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    const valor = parseFloat(newLancamento.valor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      toast.error("Valor deve ser um número positivo")
      return
    }

    await criarLancamento.mutateAsync({
      ...newLancamento,
      valor,
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

  const handleFilterChange = (key: keyof FiltrosFinanceiro, value: string) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestão Financeira</h1>
          <p className="mt-2 text-sm text-slate-600">
            Controle o fluxo de caixa e acompanhe os lançamentos financeiros da clínica
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Relatório
          </Button>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="inline-flex items-center gap-2">
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
                    type="number"
                    step="0.01"
                    min="0"
                    value={newLancamento.valor}
                    onChange={(e) => setNewLancamento(prev => ({ ...prev, valor: e.target.value }))}
                    placeholder="0,00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={newLancamento.data}
                    onChange={(e) => setNewLancamento(prev => ({ ...prev, data: e.target.value }))}
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setOpenDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={criarLancamento.isLoading}>
                    {criarLancamento.isLoading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid gap-4 md:grid-cols-3">
        {loadingResumo ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <Card className="border-green-100 bg-green-50/80">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total de Entradas</p>
                    <p className="text-2xl font-semibold text-green-700">
                      {canViewFullFinancials(usuario?.tipo_usuario || '') ? (
                        formatCurrency(totaisVisiveis?.totalEntradas || 0)
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-4 w-4" />
                          Restrito
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 bg-red-50/80">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-red-100 p-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total de Saídas</p>
                    <p className="text-2xl font-semibold text-red-700">
                      {canViewFullFinancials(usuario?.tipo_usuario || '') ? (
                        formatCurrency(totaisVisiveis?.totalSaidas || 0)
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-4 w-4" />
                          Restrito
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 bg-blue-50/80">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Saldo Líquido</p>
                    <p className={`text-2xl font-semibold ${
                      (totaisVisiveis?.saldoLiquido || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {canViewFullFinancials(usuario?.tipo_usuario || '') ? (
                        formatCurrency(totaisVisiveis?.saldoLiquido || 0)
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-4 w-4" />
                          Restrito
                        </span>
                      )}
                    </p>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filtros.dataInicio || ''}
                onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filtros.dataFim || ''}
                onChange={(e) => handleFilterChange('dataFim', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={filtros.categoria || ''}
                onValueChange={(value) => handleFilterChange('categoria', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  <SelectItem value="PARTICULAR">Particular</SelectItem>
                  <SelectItem value="CONVENIO">Convênio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Lançamentos */}
      <Card>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}