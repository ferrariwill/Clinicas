"use client"

import { useState } from "react"
import { Building2, Plus, Pencil, UserX, UserCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { ConvenioRequest, ConvenioResponse } from "@/types/api"
import {
  useConveniosCatalogo,
  useCriarConvenioCatalogo,
  useAtualizarConvenioCatalogo,
  useDesativarConvenioCatalogo,
  useReativarConvenioCatalogo,
} from "@/hooks/use-convenios-catalogo"

export default function ConveniosPage() {
  const { data: lista, isLoading } = useConveniosCatalogo()
  const criar = useCriarConvenioCatalogo()
  const atualizar = useAtualizarConvenioCatalogo()
  const desativar = useDesativarConvenioCatalogo()
  const reativar = useReativarConvenioCatalogo()

  const [open, setOpen] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<ConvenioResponse | null>(null)
  const [nome, setNome] = useState("")
  const [editNome, setEditNome] = useState("")
  const [editAtivo, setEditAtivo] = useState(true)

  const openEditar = (c: ConvenioResponse) => {
    setEditing(c)
    setEditNome(c.nome)
    setEditAtivo(c.ativo)
    setOpenEdit(true)
  }

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault()
    const n = nome.trim()
    if (!n) return
    const body: ConvenioRequest = { nome: n, ativo: true }
    criar.mutate(body, {
      onSuccess: () => {
        setOpen(false)
        setNome("")
      },
    })
  }

  const handleEditar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const n = editNome.trim()
    if (!n) return
    atualizar.mutate(
      { id: editing.id, data: { nome: n, ativo: editAtivo } },
      {
        onSuccess: () => {
          setOpenEdit(false)
          setEditing(null)
        },
      }
    )
  }

  const rows = lista ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Convênios</h1>
          <p className="mt-2 text-sm text-slate-600">
            Cadastre planos e convênios da clínica. Eles podem ser vinculados a procedimentos na API.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo convênio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum convênio cadastrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{c.nome}</td>
                      <td className="px-4 py-3">
                        {c.ativo ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                            Ativo
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditar(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {c.ativo ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-amber-700"
                              disabled={desativar.isPending}
                              onClick={() => desativar.mutate(c.id)}
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
                              onClick={() => reativar.mutate(c.id)}
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
          <DialogTitle>Novo convênio</DialogTitle>
          <DialogDescription>Informe o nome do plano ou operadora.</DialogDescription>
          <form onSubmit={handleCriar} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="cnome">Nome</Label>
              <Input id="cnome" value={nome} onChange={(e) => setNome(e.target.value)} required />
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
          <DialogTitle>Editar convênio</DialogTitle>
          <form onSubmit={handleEditar} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="cenome">Nome</Label>
              <Input id="cenome" value={editNome} onChange={(e) => setEditNome(e.target.value)} required />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="cativo"
                type="checkbox"
                checked={editAtivo}
                onChange={(e) => setEditAtivo(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="cativo" className="font-normal">
                Ativo
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={atualizar.isPending}>
                {atualizar.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
