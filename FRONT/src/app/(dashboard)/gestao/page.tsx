"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Layers, Plus, Shield } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import {
  useGestaoTelas,
  useGestaoTiposUsuario,
  useGestaoPermissoesTipo,
  useCriarGestaoTipo,
  useAtualizarGestaoTipo,
  useDesativarGestaoTipo,
  useToggleGestaoPermissao,
  type TipoUsuarioGestao,
} from "@/hooks/use-clinica-gestao"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PAPEIS: { value: string; label: string }[] = [
  { value: "MEDICO", label: "Médico" },
  { value: "SECRETARIA", label: "Secretária" },
  { value: "DONO", label: "Dono" },
]

const emptyCriar = { nome: "", descricao: "", papel: "MEDICO" as string }

export default function GestaoPerfisPage() {
  const router = useRouter()
  const { usuario, hasPermission } = useAuth()
  const allowed = hasPermission(["DONO", "DONO_CLINICA", "ADM_GERAL"])

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [openCriar, setOpenCriar] = useState(false)
  const [openEditar, setOpenEditar] = useState(false)
  const [criarForm, setCriarForm] = useState(emptyCriar)
  const [editForm, setEditForm] = useState<{ id: number; nome: string; descricao: string; papel: string } | null>(
    null
  )

  const telasQuery = useGestaoTelas()
  const { data: telas = [], isLoading: loadingTelas, isError: telasError, error: telasErrObj, refetch: refetchTelas } =
    telasQuery
  const { data: tipos = [], isLoading: loadingTipos } = useGestaoTiposUsuario()
  const { data: permissoes = [], isLoading: loadingPerm } = useGestaoPermissoesTipo(selectedId)

  const criar = useCriarGestaoTipo()
  const atualizar = useAtualizarGestaoTipo()
  const desativar = useDesativarGestaoTipo()
  const togglePerm = useToggleGestaoPermissao()

  const telasOrdenadas = useMemo(
    () => [...telas].filter((t) => t.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [telas]
  )

  const permitidosSet = useMemo(() => {
    const s = new Set<number>()
    for (const p of permissoes) {
      if (p.tela_id > 0) s.add(p.tela_id)
    }
    return s
  }, [permissoes])

  const selectedTipo = useMemo(
    () => (selectedId ? tipos.find((t) => t.id === selectedId) : undefined),
    [tipos, selectedId]
  )

  useEffect(() => {
    if (!allowed) return
    if (tipos.length && selectedId == null) {
      setSelectedId(tipos[0].id)
    }
    if (selectedId != null && !tipos.some((t) => t.id === selectedId)) {
      setSelectedId(tipos[0]?.id ?? null)
    }
  }, [allowed, tipos, selectedId])

  if (!usuario) {
    return null
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900">
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-2 text-amber-800">Apenas o dono da clínica (ou administrador global) pode gerenciar perfis e telas.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Voltar ao dashboard
        </Button>
      </div>
    )
  }

  const openEdit = (t: TipoUsuarioGestao) => {
    setEditForm({ id: t.id, nome: t.nome, descricao: t.descricao, papel: t.papel })
    setOpenEditar(true)
  }

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault()
    const nome = criarForm.nome.trim()
    const descricao = criarForm.descricao.trim()
    if (!nome || !descricao) return
    criar.mutate(
      { nome, descricao, papel: criarForm.papel },
      {
        onSuccess: () => {
          setOpenCriar(false)
          setCriarForm(emptyCriar)
        },
      }
    )
  }

  const handleEditar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm) return
    const nome = editForm.nome.trim()
    const descricao = editForm.descricao.trim()
    if (!nome || !descricao) return
    atualizar.mutate(
      { id: editForm.id, nome, descricao, papel: editForm.papel },
      {
        onSuccess: () => {
          setOpenEditar(false)
          setEditForm(null)
        },
      }
    )
  }

  const onToggleTela = (telaId: number, checked: boolean) => {
    if (selectedId == null) return
    togglePerm.mutate({ tipoUsuarioId: selectedId, telaId, grant: checked })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Crie tipos de perfil na clínica e defina quais telas cada um acessa. Usuários da equipe continuam em{" "}
            <span className="font-medium text-slate-800">Equipe</span>.
          </p>
        </div>
        <Button onClick={() => setOpenCriar(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo perfil
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5" />
              Perfis ({tipos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTipos && <p className="text-sm text-slate-400">Carregando...</p>}
            {!loadingTipos && !tipos.length && (
              <p className="text-sm text-slate-500">Nenhum tipo cadastrado. Crie um perfil para começar.</p>
            )}
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {tipos.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                      selectedId === t.id ? "bg-slate-100" : ""
                    }`}
                  >
                    <span className="font-medium text-slate-900">{t.nome}</span>
                    <span className="text-xs text-slate-500">{t.papel}</span>
                  </button>
                </li>
              ))}
            </ul>
            {selectedTipo && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => openEdit(selectedTipo)}>
                  Editar perfil
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    if (
                      confirm(
                        `Desativar o perfil "${selectedTipo.nome}"? Ele deixa de aparecer nas listagens até ser reativado.`
                      )
                    ) {
                      desativar.mutate(selectedTipo.id, {
                        onSuccess: () => setSelectedId(null),
                      })
                    }
                  }}
                >
                  Desativar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5" />
              Telas permitidas
              {selectedTipo ? (
                <span className="font-normal text-slate-500">— {selectedTipo.nome}</span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedId && <p className="text-sm text-slate-500">Selecione um perfil à esquerda.</p>}
            {selectedId != null && loadingTelas && <p className="text-sm text-slate-400">Carregando telas...</p>}
            {selectedId != null && telasError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <p className="font-medium">Não foi possível carregar o catálogo de telas.</p>
                <p className="mt-1 text-xs opacity-90">
                  {(telasErrObj as Error)?.message ?? "Verifique se a API está no ar e tente novamente."}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetchTelas()}>
                  Tentar de novo
                </Button>
              </div>
            )}
            {selectedId != null && !loadingTelas && !telasError && telasOrdenadas.length === 0 && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Nenhuma tela cadastrada no sistema. Reinicie a API após atualização para rodar o seed do catálogo
                na tabela de telas, ou cadastre telas pelo painel admin.
              </p>
            )}
            {selectedId != null && !loadingTelas && !telasError && (
              <div className="space-y-2">
                {loadingPerm && <p className="text-xs text-slate-400">Sincronizando permissões...</p>}
                <ul className="max-h-[480px] space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {telasOrdenadas.map((tela) => {
                    const checked = permitidosSet.has(tela.id)
                    return (
                      <li
                        key={tela.id}
                        className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          id={`tela-${tela.id}`}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                          checked={checked}
                          disabled={togglePerm.isPending}
                          onChange={(e) => onToggleTela(tela.id, e.target.checked)}
                        />
                        <label htmlFor={`tela-${tela.id}`} className="flex-1 cursor-pointer text-sm">
                          <span className="font-medium text-slate-900">{tela.nome}</span>
                          <span className="block text-xs text-slate-500 font-mono">{tela.rota}</span>
                          {tela.descricao ? (
                            <span className="mt-0.5 block text-xs text-slate-600">{tela.descricao}</span>
                          ) : null}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openCriar} onOpenChange={setOpenCriar}>
        <DialogContent className="max-w-md">
          <DialogTitle>Novo perfil</DialogTitle>
          <DialogDescription>Nome, descrição e papel RBAC (Médico, Secretária ou Dono).</DialogDescription>
          <form onSubmit={handleCriar} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="cnome">Nome *</Label>
              <Input
                id="cnome"
                value={criarForm.nome}
                onChange={(e) => setCriarForm((p) => ({ ...p, nome: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cdesc">Descrição *</Label>
              <Input
                id="cdesc"
                value={criarForm.descricao}
                onChange={(e) => setCriarForm((p) => ({ ...p, descricao: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Papel *</Label>
              <Select value={criarForm.papel} onValueChange={(v) => setCriarForm((p) => ({ ...p, papel: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEIS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenCriar(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending}>
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditar} onOpenChange={setOpenEditar}>
        <DialogContent className="max-w-md">
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>Altere nome, descrição ou papel.</DialogDescription>
          {editForm && (
            <form onSubmit={handleEditar} className="mt-4 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="enome">Nome *</Label>
                <Input
                  id="enome"
                  value={editForm.nome}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, nome: e.target.value } : p))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edesc">Descrição *</Label>
                <Input
                  id="edesc"
                  value={editForm.descricao}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, descricao: e.target.value } : p))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Papel *</Label>
                <Select
                  value={editForm.papel}
                  onValueChange={(v) => setEditForm((p) => (p ? { ...p, papel: v } : p))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEIS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenEditar(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={atualizar.isPending}>
                  Salvar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
