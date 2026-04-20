"use client"

import { useState, useEffect } from "react"
import { Building2, Plus, Power } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAdminClinicas, useCriarClinica, useToggleClinica, usePlanos, CriarClinicaPayload } from "@/hooks/use-admin"
import { toast } from "sonner"
import { maskDataBR, dataBRToISO, dataISOToBR, digitsOnly, maskDocumentoBR, maskPhoneBR } from "@/lib/utils/masks"

const today = () => new Date().toISOString().split("T")[0]

const empty = (): CriarClinicaPayload => ({
  nome: "",
  documento: "",
  email_responsavel: "",
  nome_responsavel: "",
  telefone: "",
  endereco: "",
  ativa: true,
  plano_id: 0,
  data_inicio: today(),
  periodo_assinatura: "ANUAL",
  periodo_meses: null,
  data_fim: null,
})

export default function AdminClinicasPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CriarClinicaPayload>(empty())
  const [dataInicioBR, setDataInicioBR] = useState(() => dataISOToBR(today()))
  const { data: clinicas, isLoading } = useAdminClinicas()
  const { data: planos } = usePlanos()
  const criar = useCriarClinica()
  const toggle = useToggleClinica()

  useEffect(() => {
    if (open) {
      setDataInicioBR(dataISOToBR(form.data_inicio))
    }
  }, [open, form.data_inicio])

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "documento") {
      setForm((p) => ({ ...p, documento: maskDocumentoBR(value) }))
      return
    }
    if (name === "telefone") {
      setForm((p) => ({ ...p, telefone: maskPhoneBR(value) }))
      return
    }
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plano_id) {
      toast.error("Selecione o plano de assinatura da clínica")
      return
    }
    const docDigits = digitsOnly(form.documento)
    if (docDigits.length !== 11 && docDigits.length !== 14) {
      toast.error("Documento deve ser CPF (11) ou CNPJ (14)")
      return
    }
    const inicioIso = dataBRToISO(dataInicioBR.trim()) || form.data_inicio
    if (!inicioIso || !/^\d{4}-\d{2}-\d{2}$/.test(inicioIso)) {
      toast.error("Informe a data de início no formato dd/mm/aaaa")
      return
    }
    if (form.periodo_assinatura === "DEFINIDO" && (!form.periodo_meses || form.periodo_meses <= 0) && !form.data_fim) {
      toast.error("Para período definido, informe meses ou data fim")
      return
    }
    criar.mutate(
      { ...form, documento: docDigits, telefone: digitsOnly(form.telefone || ""), data_inicio: inicioIso },
      { onSuccess: () => { setOpen(false); setForm(empty()); setDataInicioBR(dataISOToBR(today())) } }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Clínicas</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie todas as clínicas do sistema</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> Nova Clínica</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Lista de Clínicas ({clinicas?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-slate-400 py-8 text-center">Carregando...</p>}
          {!isLoading && !clinicas?.length && (
            <div className="py-12 text-center text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3" />
              <p className="font-medium">Nenhuma clínica cadastrada</p>
            </div>
          )}
          <div className="space-y-3">
            {clinicas?.map((c) => {
              const titulo = c.nome?.trim() || "—"
              const inicial = titulo.charAt(0).toUpperCase()
              return (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-700">{inicial}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{titulo}</p>
                    <p className="text-sm text-slate-500 break-all">Doc: {c.documento ?? "—"} · {c.email_responsavel ?? "—"}</p>
                    <p className="text-sm text-slate-500">Dono: {c.nome_responsavel || "—"}</p>
                    <p className="text-sm text-slate-500">Telefone: {c.telefone || "—"}</p>
                    <p className="text-sm text-slate-500 break-words">Endereço: {c.endereco || "—"}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.ativa ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {c.ativa ? "Ativa" : "Inativa"}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => toggle.mutate({ id: c.id, ativa: !c.ativa })} className="gap-1 w-full sm:w-auto">
                    <Power className="h-3 w-3" />{c.ativa ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            )})}
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle>Nova Clínica</DialogTitle>
          <DialogDescription>
            É obrigatório vincular um plano. O usuário dono da clínica terá senha inicial com os dígitos do documento (CPF/CNPJ).
          </DialogDescription>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" value={form.nome} onChange={handleField} placeholder="Clínica São Lucas" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="documento">Documento (CPF/CNPJ) *</Label>
              <Input id="documento" name="documento" value={form.documento} onChange={handleField} placeholder="000.000.000-00 ou 00.000.000/0001-00" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nome_responsavel">Nome do dono *</Label>
              <Input id="nome_responsavel" name="nome_responsavel" value={form.nome_responsavel} onChange={handleField} placeholder="Nome do dono da clínica" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email_responsavel">E-mail do Responsável *</Label>
              <Input id="email_responsavel" name="email_responsavel" type="email" value={form.email_responsavel} onChange={handleField} placeholder="responsavel@clinica.com" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" value={form.telefone} onChange={handleField} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" value={form.endereco} onChange={handleField} placeholder="Rua, número, bairro, cidade/UF" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plano_id">Plano de assinatura *</Label>
              <select
                id="plano_id"
                value={form.plano_id || ""}
                onChange={(e) => setForm((p) => ({ ...p, plano_id: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              >
                <option value="">Selecione um plano</option>
                {planos?.filter((p) => p.ativo).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — R$ {p.valor.toFixed(2)}/mês
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="data_inicio">Início da assinatura *</Label>
              <Input
                id="data_inicio"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={dataInicioBR}
                onChange={(e) => {
                  const br = maskDataBR(e.target.value)
                  setDataInicioBR(br)
                  const iso = dataBRToISO(br)
                  if (iso) setForm((p) => ({ ...p, data_inicio: iso }))
                }}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="periodo_assinatura">Período da assinatura</Label>
              <select
                id="periodo_assinatura"
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
              <div className="space-y-1">
                <Label htmlFor="periodo_meses">Meses do período</Label>
                <Input
                  id="periodo_meses"
                  type="number"
                  min={1}
                  value={form.periodo_meses ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, periodo_meses: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Ex.: 3"
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending} className="gap-2">
                <Plus className="h-4 w-4" />{criar.isPending ? "Criando..." : "Criar Clínica"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
