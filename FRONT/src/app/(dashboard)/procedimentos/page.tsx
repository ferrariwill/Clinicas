"use client"

import { useMemo, useState } from "react"
import { ClipboardList, Plus, Pencil, UserX, UserCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { ProcedimentoRequest, ProcedimentoResponse } from "@/types/api"
import {
  useProcedimentos,
  useCriarProcedimento,
  useAtualizarProcedimento,
  useDesativarProcedimento,
  useReativarProcedimento,
} from "@/hooks/use-agenda"

const empty: ProcedimentoRequest = { nome: "", descricao: "", duracao_minutos: 30, valor: 0 }

export default function ProcedimentosPage() {
  const { data: lista, isLoading } = useProcedimentos()
  const criar = useCriarProcedimento()
  const atualizar = useAtualizarProcedimento()
  const desativar = useDesativarProcedimento()
  const reativar = useReativarProcedimento()

  const [open, setOpen] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<ProcedimentoResponse | null>(null)
  const [form, setForm] = useState(empty)
  const [editForm, setEditForm] = useState(empty)

  const rows = useMemo(() => lista ?? [], [lista])

  const openEditar = (p: ProcedimentoResponse) => {
    setEditing(p)
    setEditForm({
      nome: p.nome,
      descricao: p.descricao ?? "",
      duracao_minutos: p.duracao_minutos,
      valor: p.valor,
    })
    setOpenEdit(true)
  }

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    criar.mutate(form, {
      onSuccess: () => {
        setOpen(false)
        setForm(empty)
      },
    })
  }

  const handleEditar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editForm.nome.trim()) return
    atualizar.mutate(
      {
        id: editing.id,
        data: editForm,
        opts: { ativo: editing.ativo !== false, convenio_id: 0 },
      },
      {
        onSuccess: () => {
          setOpenEdit(false)
          setEditing(null)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Cadastre, edite ou desative itens do catálogo usados na agenda e nos atendimentos.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo procedimento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Catálogo ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum procedimento cadastrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Duração (min)</th>
                    <th className="px-4 py-3 font-medium">Valor (R$)</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{p.nome}</div>
                        {p.descricao ? (
                          <div className="text-xs text-slate-500 line-clamp-1">{p.descricao}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.duracao_minutos}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        {p.ativo === false ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                            Inativo
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditar(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {p.ativo !== false ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-amber-700"
                              disabled={desativar.isPending}
                              onClick={() => desativar.mutate(p.id)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-emerald-700"
                              disabled={reativar.isPending}
                              onClick={() => reativar.mutate(p.id)}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Novo procedimento</DialogTitle>
          <DialogDescription>Preencha nome, duração e valor base.</DialogDescription>
          <form onSubmit={handleCriar} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="desc">Descrição (opcional)</Label>
              <Input
                id="desc"
                value={form.descricao}
                onChange={(e) => setForm((s) => ({ ...s, descricao: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dur">Duração (minutos)</Label>
                <Input
                  id="dur"
                  type="number"
                  min={1}
                  value={form.duracao_minutos}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, duracao_minutos: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.valor}
                  onChange={(e) => setForm((s) => ({ ...s, valor: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Editar procedimento</DialogTitle>
          <DialogDescription>Altere os dados e salve.</DialogDescription>
          <form onSubmit={handleEditar} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="enome">Nome</Label>
              <Input
                id="enome"
                value={editForm.nome}
                onChange={(e) => setEditForm((s) => ({ ...s, nome: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="edesc">Descrição</Label>
              <Input
                id="edesc"
                value={editForm.descricao}
                onChange={(e) => setEditForm((s) => ({ ...s, descricao: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edur">Duração (minutos)</Label>
                <Input
                  id="edur"
                  type="number"
                  min={1}
                  value={editForm.duracao_minutos}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, duracao_minutos: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="evalor">Valor (R$)</Label>
                <Input
                  id="evalor"
                  type="number"
                  step="0.01"
                  min={0}
                  value={editForm.valor}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, valor: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
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
