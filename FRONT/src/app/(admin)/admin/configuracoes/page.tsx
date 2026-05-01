"use client"

import { useState, useEffect } from "react"
import { Settings, Plus, Power, Pencil, Menu } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  usePlanos,
  useCriarPlano,
  useAtualizarPlano,
  useTogglePlanoAtivo,
  type Plano,
  type CriarPlanoPayload,
} from "@/hooks/use-admin"

const emptyPlano: CriarPlanoPayload = { nome: "", descricao: "", valor: 0, limite_usuarios: 5, ativo: true }

export default function AdminConfiguracoesPage() {
  const [open, setOpen] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [form, setForm] = useState<CriarPlanoPayload>(emptyPlano)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<CriarPlanoPayload>(emptyPlano)
  const { data: planos, isLoading } = usePlanos()
  const criar = useCriarPlano()
  const atualizar = useAtualizarPlano()
  const toggleAtivo = useTogglePlanoAtivo()

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === "number" ? Number(e.target.value) : e.target.value
    setForm((p) => ({ ...p, [e.target.name]: val }))
  }

  const handleEditField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === "number" ? Number(e.target.value) : e.target.value
    setEditForm((p) => ({ ...p, [e.target.name]: val }))
  }

  const abrirEdicao = (p: Plano) => {
    setEditId(p.id)
    setEditForm({
      nome: p.nome,
      descricao: p.descricao ?? "",
      valor: p.valor,
      limite_usuarios: p.limite_usuarios,
      ativo: p.ativo,
    })
    setOpenEdit(true)
  }

  useEffect(() => {
    if (!openEdit) setEditId(null)
  }, [openEdit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    criar.mutate(form, { onSuccess: () => { setOpen(false); setForm(emptyPlano) } })
  }

  const handleSubmitEdicao = (e: React.FormEvent) => {
    e.preventDefault()
    if (editId == null) return
    atualizar.mutate(
      { id: editId, ...editForm },
      { onSuccess: () => { setOpenEdit(false); setEditId(null) } }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">Configurações</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie os planos disponíveis no sistema (nome, valor e limite de usuários).</p>
      </div>
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            Menus por tipo de usuário (clínica)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-300">
          <p>
            O bloqueio ou liberação de itens do menu lateral por perfil (secretária, médico, etc.) é configurado{" "}
            <strong>dentro de cada clínica</strong>, em{" "}
            <span className="font-medium text-slate-800 dark:text-slate-100">Perfis e telas</span> (área logada do dono:
            Gestão). Lá, cada tipo de usuário recebe as rotas/telas permitidas; o menu e as permissões seguem essa lista.
          </p>
        </CardContent>
      </Card>
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{p.nome}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.descricao || "—"}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${p.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">R$ {p.valor.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">por mês · até {p.limite_usuarios} usuários</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => abrirEdicao(p)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={toggleAtivo.isPending}
                      onClick={() => toggleAtivo.mutate({ id: p.id, ativo: p.ativo })}
                    >
                      <Power className="h-3 w-3" />{p.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
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
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md">
          <DialogTitle>Editar plano</DialogTitle>
          <DialogDescription>Altere nome, descrição, valor mensal e limite de usuários.</DialogDescription>
          <form onSubmit={handleSubmitEdicao} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-nome">Nome do Plano *</Label>
              <Input id="edit-nome" name="nome" value={editForm.nome} onChange={handleEditField} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-desc">Descrição</Label>
              <Input id="edit-desc" name="descricao" value={editForm.descricao} onChange={handleEditField} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-valor">Valor Mensal (R$) *</Label>
                <Input id="edit-valor" name="valor" type="number" min={0} step={0.01} value={editForm.valor} onChange={handleEditField} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-lim">Limite de Usuários *</Label>
                <Input id="edit-lim" name="limite_usuarios" type="number" min={1} value={editForm.limite_usuarios} onChange={handleEditField} required />
              </div>
            </div>
            <p className="text-xs text-slate-500">Para ativar ou desativar o plano no catálogo, use o botão no card (não altera assinaturas já vinculadas).</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpenEdit(false)}>Cancelar</Button>
              <Button type="submit" disabled={atualizar.isPending}>
                {atualizar.isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
