"use client"

import { useState } from "react"
import { DollarSign, TrendingUp, CheckCircle, XCircle, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAssinaturas, useCriarAssinatura, usePlanos, useAdminClinicas, CriarAssinaturaPayload } from "@/hooks/use-admin"
import { toast } from "sonner"
import { dataBRToISO, dataISOToBR, maskDataBR } from "@/lib/utils/masks"

const emptyForm: CriarAssinaturaPayload = {
  clinica_id: 0,
  plano_id: 0,
  data_inicio: new Date().toISOString().split("T")[0],
  periodo_assinatura: "ANUAL",
  periodo_meses: null,
  data_fim: null,
}

export default function AdminFinanceiroPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CriarAssinaturaPayload>(emptyForm)
  const [inicioBR, setInicioBR] = useState(dataISOToBR(emptyForm.data_inicio))
  const [fimBR, setFimBR] = useState("")
  const { data: assinaturas, isLoading } = useAssinaturas()
  const { data: planos } = usePlanos()
  const { data: clinicas } = useAdminClinicas()
  const criar = useCriarAssinatura()

  const ativas = assinaturas?.filter((a) => a.ativa) ?? []
  const receitaMensal = ativas.reduce((acc, a) => acc + (planos?.find((p) => p.id === a.plano_id)?.valor ?? 0), 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const inicio = dataBRToISO(inicioBR) ?? form.data_inicio
    if (!inicio) {
      toast.error("Data de início inválida (dd/mm/aaaa)")
      return
    }
    const fimIso = fimBR.trim() ? dataBRToISO(fimBR.trim()) : null
    if (fimBR.trim() && !fimIso) {
      toast.error("Data fim inválida (dd/mm/aaaa)")
      return
    }
    if (form.periodo_assinatura === "DEFINIDO" && (!form.periodo_meses || form.periodo_meses <= 0) && !fimIso) {
      toast.error("Para período definido, informe meses ou data fim")
      return
    }
    criar.mutate(
      { ...form, data_inicio: inicio, data_fim: fimIso },
      {
        onSuccess: () => {
          setOpen(false)
          setForm(emptyForm)
          setInicioBR(dataISOToBR(emptyForm.data_inicio))
          setFimBR("")
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Financeiro Geral</h2>
          <p className="text-sm text-slate-500 mt-1">Receita consolidada de todas as assinaturas</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> Nova Assinatura</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Receita Mensal", value: `R$ ${receitaMensal.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Receita Anual (projeção)", value: `R$ ${(receitaMensal * 12).toFixed(2)}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Assinaturas Ativas", value: String(ativas.length), icon: CheckCircle, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Assinaturas Inativas", value: String((assinaturas?.length ?? 0) - ativas.length), icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <div className={`rounded-lg p-2 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-slate-900">{value}</p></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Assinaturas ({assinaturas?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-slate-400 py-8 text-center">Carregando...</p>}
          {!isLoading && !assinaturas?.length && <p className="text-sm text-slate-400 py-8 text-center">Nenhuma assinatura cadastrada</p>}
          <div className="space-y-3">
            {assinaturas?.map((a) => {
              const plano = planos?.find((p) => p.id === a.plano_id)
              const clinica = clinicas?.find((c) => c.id === a.clinica_id)
              return (
                <div key={a.id} className="rounded-xl border border-slate-200 p-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{clinica?.nome ?? `Clínica #${a.clinica_id}`}</p>
                    <p className="text-sm text-slate-500 break-words">Plano: {plano?.nome ?? `#${a.plano_id}`} · Início: {new Date(a.data_inicio).toLocaleDateString("pt-BR")} · Fim: {a.data_expiracao ? new Date(a.data_expiracao).toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <p className="font-semibold text-emerald-600">R$ {plano?.valor?.toFixed(2) ?? "—"}/mês</p>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${a.ativa ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {a.ativa ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle>Nova Assinatura</DialogTitle>
          <DialogDescription>Vincule uma clínica a um plano.</DialogDescription>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label>Clínica *</Label>
              <select value={form.clinica_id} onChange={(e) => setForm((p) => ({ ...p, clinica_id: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" required>
                <option value={0}>Selecione</option>
                {clinicas?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Plano *</Label>
              <select value={form.plano_id} onChange={(e) => setForm((p) => ({ ...p, plano_id: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" required>
                <option value={0}>Selecione</option>
                {planos?.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome} — R$ {p.valor.toFixed(2)}/mês</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Data de Início *</Label>
              <input
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={inicioBR}
                onChange={(e) => {
                  const br = maskDataBR(e.target.value)
                  setInicioBR(br)
                  const iso = dataBRToISO(br)
                  if (iso) setForm((p) => ({ ...p, data_inicio: iso }))
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Período</Label>
              <select
                value={form.periodo_assinatura ?? "ANUAL"}
                onChange={(e) => setForm((p) => ({ ...p, periodo_assinatura: e.target.value as "ANUAL" | "SEMESTRAL" | "DEFINIDO" }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="ANUAL">Anual (12 meses)</option>
                <option value="SEMESTRAL">Semestral (6 meses)</option>
                <option value="DEFINIDO">Definido</option>
              </select>
            </div>
            {form.periodo_assinatura === "DEFINIDO" && (
              <>
                <div className="space-y-1">
                  <Label>Meses (ou informe data fim)</Label>
                  <input
                    type="number"
                    min={1}
                    value={form.periodo_meses ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, periodo_meses: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data fim (opcional)</Label>
                  <input
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    value={fimBR}
                    onChange={(e) => {
                      const br = maskDataBR(e.target.value)
                      setFimBR(br)
                      const iso = dataBRToISO(br)
                      setForm((p) => ({ ...p, data_fim: iso }))
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending} className="gap-2">
                <Plus className="h-4 w-4" />{criar.isPending ? "Criando..." : "Criar Assinatura"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
