"use client"

import { useState } from "react"
import { Settings, Plus, Power } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { usePlanos, useCriarPlano, CriarPlanoPayload } from "@/hooks/use-admin"

const emptyPlano: CriarPlanoPayload = { nome: "", descricao: "", valor: 0, limite_usuarios: 5, ativo: true }

export default function AdminConfiguracoesPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CriarPlanoPayload>(emptyPlano)
  const { data: planos, isLoading } = usePlanos()
  const criar = useCriarPlano()

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === "number" ? Number(e.target.value) : e.target.value
    setForm((p) => ({ ...p, [e.target.name]: val }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    criar.mutate(form, { onSuccess: () => { setOpen(false); setForm(emptyPlano) } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Configurações</h2>
        <p className="text-sm text-slate-500 mt-1">Gerencie os planos disponíveis no sistema</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Planos de Assinatura</CardTitle>
          <Button onClick={() => setOpen(true)} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo Plano</Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-slate-400 py-8 text-center">Carregando...</p>}
          {!isLoading && !planos?.length && (
            <div className="py-12 text-center text-slate-400">
              <Settings className="h-12 w-12 mx-auto mb-3" />
              <p className="font-medium">Nenhum plano cadastrado</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {planos?.map((p) => (
              <div key={p.id} className={`rounded-xl border p-5 space-y-3 ${p.ativo ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-slate-50 opacity-60"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{p.nome}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.descricao}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">R$ {p.valor.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">por mês · até {p.limite_usuarios} usuários</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1"><Power className="h-3 w-3" />{p.ativo ? "Desativar" : "Ativar"}</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Novo Plano</DialogTitle>
          <DialogDescription>Defina os detalhes do plano de assinatura.</DialogDescription>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome do Plano *</Label>
              <Input id="nome" name="nome" value={form.nome} onChange={handleField} placeholder="Plano Básico" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" name="descricao" value={form.descricao} onChange={handleField} placeholder="Ideal para clínicas pequenas" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="valor">Valor Mensal (R$) *</Label>
                <Input id="valor" name="valor" type="number" min={0} step={0.01} value={form.valor} onChange={handleField} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="limite_usuarios">Limite de Usuários *</Label>
                <Input id="limite_usuarios" name="limite_usuarios" type="number" min={1} value={form.limite_usuarios} onChange={handleField} required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending} className="gap-2">
                <Plus className="h-4 w-4" />{criar.isPending ? "Criando..." : "Criar Plano"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
