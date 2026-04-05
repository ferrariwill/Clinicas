"use client"

import { useState } from "react"
import { Building2, Plus, Power } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAdminClinicas, useCriarClinica, useToggleClinica, CriarClinicaPayload } from "@/hooks/use-admin"

const empty: CriarClinicaPayload = { nome: "", cnpj: "", email_responsavel: "", ativa: true }

export default function AdminClinicasPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CriarClinicaPayload>(empty)
  const { data: clinicas, isLoading } = useAdminClinicas()
  const criar = useCriarClinica()
  const toggle = useToggleClinica()

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    criar.mutate(form, { onSuccess: () => { setOpen(false); setForm(empty) } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clínicas</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie todas as clínicas do sistema</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Clínica</Button>
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
            {clinicas?.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-700">{c.nome.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{c.nome}</p>
                    <p className="text-sm text-slate-500">CNPJ: {c.cnpj} · {c.email_responsavel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.ativa ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {c.ativa ? "Ativa" : "Inativa"}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => toggle.mutate({ id: c.id, ativa: !c.ativa })} className="gap-1">
                    <Power className="h-3 w-3" />{c.ativa ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Nova Clínica</DialogTitle>
          <DialogDescription>Ao criar, um usuário admin será gerado com senha = números do CNPJ.</DialogDescription>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" value={form.nome} onChange={handleField} placeholder="Clínica São Lucas" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input id="cnpj" name="cnpj" value={form.cnpj} onChange={handleField} placeholder="00.000.000/0001-00" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email_responsavel">E-mail do Responsável *</Label>
              <Input id="email_responsavel" name="email_responsavel" type="email" value={form.email_responsavel} onChange={handleField} placeholder="responsavel@clinica.com" required />
            </div>
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
