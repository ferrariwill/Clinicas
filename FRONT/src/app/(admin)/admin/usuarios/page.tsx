"use client"

import { useState } from "react"
import { Power, Search, UserPlus, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  useAdminUsuarios,
  useAdminClinicas,
  useCriarUsuarioPlataforma,
  useToggleUsuarioPlataformaAdmin,
} from "@/hooks/use-admin"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

const PAPEL_LABEL: Record<string, string> = { ADM_GERAL: "Admin Geral", DONO: "Dono", MEDICO: "Médico", SECRETARIA: "Secretária", Administrador: "Administrador" }
const PAPEL_COLOR: Record<string, string> = { ADM_GERAL: "bg-red-100 text-red-700", DONO: "bg-violet-100 text-violet-700", MEDICO: "bg-blue-100 text-blue-700", SECRETARIA: "bg-amber-100 text-amber-700", Administrador: "bg-slate-100 text-slate-700" }

function isAdmGeral(tipo: string) {
  return tipo === "ADM_GERAL" || tipo === "Administrador"
}

export default function AdminUsuariosPage() {
  const { usuario } = useAuth()
  const meuId = usuario?.id ? Number(usuario.id) : 0
  const [search, setSearch] = useState("")
  const [openAdmin, setOpenAdmin] = useState(false)
  const [novoAdmin, setNovoAdmin] = useState({ nome: "", email: "" })
  const { data: usuarios, isLoading } = useAdminUsuarios()
  const { data: clinicas } = useAdminClinicas()
  const criarAdminPlataforma = useCriarUsuarioPlataforma()
  const togglePlataforma = useToggleUsuarioPlataformaAdmin()

  const filtered =
    usuarios?.filter((u) => {
      const nome = u.nome.trim()
      const q = search.toLowerCase()
      return nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }) ?? []
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, u) => {
    const key = String(u.clinica_id)
    if (!acc[key]) acc[key] = []
    acc[key].push(u)
    return acc
  }, {})
  const clinicIds = Object.keys(grouped).sort((a, b) => Number(a) - Number(b))

  const submitNovoAdmin = (e: React.FormEvent) => {
    e.preventDefault()
    const nome = novoAdmin.nome.trim()
    if (nome.length < 2) {
      toast.error("Informe o nome completo do administrador (mínimo 2 caracteres)")
      return
    }
    criarAdminPlataforma.mutate(
      {
        nome,
        email: novoAdmin.email.trim(),
      },
      {
        onSuccess: () => {
          setOpenAdmin(false)
          setNovoAdmin({ nome: "", email: "" })
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Usuários</h2>
          <p className="text-sm text-slate-500 mt-1">Todos os usuários cadastrados no sistema</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          <Button type="button" variant="secondary" className="gap-2 w-full sm:w-auto shrink-0" onClick={() => setOpenAdmin(true)}>
            <UserPlus className="h-4 w-4" />
            Novo admin da plataforma
          </Button>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuário..." className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-full" />
          </div>
        </div>
      </div>
      <Dialog open={openAdmin} onOpenChange={setOpenAdmin}>
        <DialogContent className="max-w-md">
          <DialogTitle>Novo administrador da plataforma</DialogTitle>
          <DialogDescription>
            Mesmo nível de acesso do administrador inicial (ADM_GERAL). A senha provisória é gerada automaticamente e enviada por e-mail; no primeiro acesso será obrigatório definir uma nova senha (igual ao fluxo da equipe na clínica).
          </DialogDescription>
          <form onSubmit={submitNovoAdmin} className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="adm-nome">Nome completo *</Label>
              <Input
                id="adm-nome"
                value={novoAdmin.nome}
                onChange={(e) => setNovoAdmin((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex.: Maria Silva"
                required
                minLength={2}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adm-email">E-mail</Label>
              <Input
                id="adm-email"
                type="email"
                value={novoAdmin.email}
                onChange={(e) => setNovoAdmin((p) => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpenAdmin(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criarAdminPlataforma.isPending}>
                {criarAdminPlataforma.isPending ? "Criando…" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader><CardTitle>Total: {filtered.length} usuários</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-slate-400 py-8 text-center">Carregando...</p>}
          {!isLoading && !filtered.length && (
            <div className="py-12 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3" />
              <p className="font-medium">Nenhum usuário encontrado</p>
            </div>
          )}
          <div className="space-y-4">
            {clinicIds.map((cid) => {
              const users = grouped[cid] ?? []
              const clinica = clinicas?.find((c) => c.id === Number(cid))
              const nAtivos = users.filter((u) => u.ativo).length
              return (
                <div key={cid} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2">
                    <p className="font-semibold text-slate-900">{clinica?.nome ?? `Clínica #${cid}`}</p>
                    <span className="text-xs rounded-full bg-slate-100 text-slate-700 px-2 py-1">
                      {users.length} usuário(s) · {nAtivos} ativo(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {users.map((u) => {
                      const nomeLimpo = u.nome.trim()
                      const inicial = (nomeLimpo || u.email).charAt(0).toUpperCase()
                      return (
                      <div key={u.id} className="rounded-lg border border-slate-100 p-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-violet-700">{inicial}</span>
                          </div>
                          <div className="min-w-0">
                            {nomeLimpo ? (
                              <>
                                <p className="font-medium text-slate-900 truncate">{nomeLimpo}</p>
                                <p className="text-sm text-slate-500 break-all">{u.email}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-slate-900 truncate">{u.email}</p>
                                <p className="text-xs text-amber-700">Nome não informado no cadastro</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${PAPEL_COLOR[u.tipo_usuario] ?? "bg-slate-100 text-slate-700"}`}>
                            {PAPEL_LABEL[u.tipo_usuario] ?? u.tipo_usuario}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${
                              u.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {u.ativo ? "Ativo" : "Inativo"}
                          </span>
                          {isAdmGeral(u.tipo_usuario) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={
                                togglePlataforma.isPending || (!u.ativo ? false : u.id === meuId)
                              }
                              onClick={() =>
                                togglePlataforma.mutate({ id: u.id, ativo: !u.ativo })
                              }
                            >
                              <Power className="h-3 w-3" />
                              {u.ativo ? "Desativar" : "Ativar"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
