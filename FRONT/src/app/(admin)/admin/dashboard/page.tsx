"use client"

import { Building2, Users, DollarSign, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminClinicas, useAdminUsuarios, useAssinaturas, usePlanos } from "@/hooks/use-admin"

export default function AdminDashboardPage() {
  const { data: clinicas } = useAdminClinicas()
  const { data: usuarios } = useAdminUsuarios()
  const { data: assinaturas } = useAssinaturas()
  const { data: planos } = usePlanos()

  const ativas = clinicas?.filter((c) => c.ativa).length ?? 0
  const assinaturasAtivas = assinaturas?.filter((a) => a.ativa) ?? []
  const receitaMensal = assinaturasAtivas.reduce((acc, a) => {
    const plano = planos?.find((p) => p.id === a.plano_id)
    return acc + (plano?.valor ?? 0)
  }, 0)

  const stats = [
    { label: "Total de Clínicas", value: clinicas?.length ?? "—", sub: `${ativas} ativas`, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total de Usuários", value: usuarios?.length ?? "—", sub: "em todas as clínicas", icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Receita Mensal", value: receitaMensal ? `R$ ${receitaMensal.toFixed(2)}` : "—", sub: `${assinaturasAtivas.length} assinaturas ativas`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Planos Disponíveis", value: planos?.length ?? "—", sub: `${planos?.filter((p) => p.ativo).length ?? 0} ativos`, icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-50" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Visão Geral</h2>
        <p className="text-sm text-slate-500 mt-1">Resumo consolidado do sistema</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <div className={`rounded-lg p-2 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Últimas Clínicas</CardTitle></CardHeader>
          <CardContent>
            {!clinicas?.length && <p className="text-sm text-slate-400 py-4 text-center">Nenhuma clínica cadastrada</p>}
            <div className="space-y-3">
              {clinicas?.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.nome}</p>
                    <p className="text-xs text-slate-400">{c.cnpj}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.ativa ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {c.ativa ? "Ativa" : "Inativa"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Assinaturas Ativas</CardTitle></CardHeader>
          <CardContent>
            {!assinaturasAtivas.length && <p className="text-sm text-slate-400 py-4 text-center">Nenhuma assinatura ativa</p>}
            <div className="space-y-3">
              {assinaturasAtivas.slice(0, 5).map((a) => {
                const plano = planos?.find((p) => p.id === a.plano_id)
                const clinica = clinicas?.find((c) => c.id === a.clinica_id)
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{clinica?.nome ?? `Clínica #${a.clinica_id}`}</p>
                      <p className="text-xs text-slate-400">{plano?.nome ?? `Plano #${a.plano_id}`}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">R$ {plano?.valor?.toFixed(2) ?? "—"}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
