"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Users, Plus, Pencil, UserX, UserCheck, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  useTiposUsuarioClinica,
  useUsuariosClinica,
  useCriarUsuarioClinica,
  useAtualizarUsuarioClinica,
  useDesativarUsuarioClinica,
  useReativarUsuarioClinica,
  useHorariosUsuarioClinica,
  useDefinirHorariosUsuarioClinica,
} from "@/hooks/use-clinica-equipe"
import { useAuth } from "@/hooks/use-auth"
import { computeTelasLiberadas, useMinhasPermissoesRotas } from "@/hooks/use-minhas-permissoes-rotas"
import type { UsuarioResponse } from "@/types/api"
import { toast } from "sonner"
import { apiClient } from "@/services/api-client"

const empty = { nome: "", email: "", tipo_usuario_id: 0 }

const DIAS_SEMANA = [
  { dia: 0, nome: "Domingo" },
  { dia: 1, nome: "Segunda-feira" },
  { dia: 2, nome: "Terça-feira" },
  { dia: 3, nome: "Quarta-feira" },
  { dia: 4, nome: "Quinta-feira" },
  { dia: 5, nome: "Sexta-feira" },
  { dia: 6, nome: "Sábado" },
] as const

type LinhaGrade = {
  dia: number
  nome: string
  trabalha: boolean
  inicio: string
  fim: string
}

function padHHMM(s: string): string {
  const t = s.trim()
  const parts = t.split(":")
  if (parts.length < 2) return "08:00"
  const h = parts[0].replace(/\D/g, "").slice(0, 2).padStart(2, "0")
  const m = (parts[1] || "00").replace(/\D/g, "").slice(0, 2).padStart(2, "0")
  return `${h}:${m}`
}

function linhasGradeIniciais(): LinhaGrade[] {
  return DIAS_SEMANA.map((d) => ({
    dia: d.dia,
    nome: d.nome,
    trabalha: false,
    inicio: "08:00",
    fim: "18:00",
  }))
}

export default function EquipePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { usuario, hasPermission, userRole } = useAuth()
  const [incluirInativos, setIncluirInativos] = useState(false)
  const { data: permRotas, isSuccess: permissoesOk } = useMinhasPermissoesRotas()
  const { podeEquipe } = useMemo(
    () => computeTelasLiberadas(permissoesOk ? permRotas : undefined, userRole),
    [permRotas, userRole, permissoesOk]
  )
  const podeGerenciar = hasPermission(["DONO", "DONO_CLINICA", "ADM_GERAL"])

  useEffect(() => {
    if (!permissoesOk) return
    if (!podeEquipe) router.replace("/agenda")
  }, [permissoesOk, podeEquipe, router])
  const [open, setOpen] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openHorarios, setOpenHorarios] = useState(false)
  const [horariosUsuarioId, setHorariosUsuarioId] = useState<string | null>(null)
  const [horariosUsuarioNome, setHorariosUsuarioNome] = useState("")
  const [linhasGrade, setLinhasGrade] = useState<LinhaGrade[]>(() => linhasGradeIniciais())
  const [capMaxPacientes, setCapMaxPacientes] = useState(1)
  const [capPermiteSimultaneo, setCapPermiteSimultaneo] = useState(false)
  const [editing, setEditing] = useState<UsuarioResponse | null>(null)
  const [form, setForm] = useState(empty)
  const [editForm, setEditForm] = useState({ nome: "", email: "", senha: "", tipo_usuario_id: 0 })
  const { data: tipos, isLoading: loadingTipos } = useTiposUsuarioClinica()
  const { data: usuarios, isLoading: loadingUsers } = useUsuariosClinica(incluirInativos)
  const criar = useCriarUsuarioClinica()
  const atualizar = useAtualizarUsuarioClinica()
  const desativar = useDesativarUsuarioClinica()
  const reativar = useReativarUsuarioClinica()
  const horariosQuery = useHorariosUsuarioClinica(horariosUsuarioId ?? undefined, openHorarios && Boolean(horariosUsuarioId))
  const salvarHorarios = useDefinirHorariosUsuarioClinica()

  const meuId = usuario?.id

  const tiposSelect = useMemo(
    () => (tipos ?? []).filter((t) => t.nome !== "Administrador"),
    [tipos]
  )

  useEffect(() => {
    if (!openHorarios || !horariosUsuarioId) return
    if (horariosQuery.isLoading) return
    const rows = horariosQuery.data ?? []
    const next = linhasGradeIniciais()
    for (const h of rows) {
      const i = next.findIndex((l) => l.dia === h.dia_semana)
      if (i >= 0) {
        next[i] = {
          ...next[i],
          trabalha: h.ativo,
          inicio: padHHMM(h.horario_inicio),
          fim: padHHMM(h.horario_fim),
        }
      }
    }
    setLinhasGrade(next)
  }, [openHorarios, horariosUsuarioId, horariosQuery.data, horariosQuery.isLoading])

  const abrirGradeHorarios = (u: UsuarioResponse) => {
    setHorariosUsuarioId(u.id)
    setHorariosUsuarioNome(u.nome)
    setLinhasGrade(linhasGradeIniciais())
    const mx = u.max_pacientes
    setCapMaxPacientes(typeof mx === "number" && mx >= 1 ? Math.min(99, mx) : 1)
    setCapPermiteSimultaneo(Boolean(u.permite_simultaneo))
    setOpenHorarios(true)
  }

  const handleSalvarHorarios = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!horariosUsuarioId) return
    for (const linha of linhasGrade) {
      if (!linha.trabalha) continue
      const a = padHHMM(linha.inicio)
      const b = padHHMM(linha.fim)
      if (a >= b) {
        toast.error(`Em ${linha.nome}, o horário de início deve ser antes do fim.`)
        return
      }
    }
    const horarios = linhasGrade
      .filter((l) => l.trabalha)
      .map((l) => ({
        dia_semana: l.dia,
        horario_inicio: padHHMM(l.inicio),
        horario_fim: padHHMM(l.fim),
        ativo: true,
      }))
    const maxOk = Math.min(99, Math.max(1, Math.round(Number(capMaxPacientes)) || 1))
    try {
      await salvarHorarios.mutateAsync({ usuarioId: horariosUsuarioId, body: { horarios } })
      await apiClient.atualizarUsuario(horariosUsuarioId, {
        max_pacientes: maxOk,
        permite_simultaneo: capPermiteSimultaneo,
      })
      queryClient.invalidateQueries({ queryKey: ["clinica-usuarios"] })
      queryClient.invalidateQueries({ queryKey: ["profissionais"] })
      toast.success("Grade e capacidade na agenda salvos.")
      setOpenHorarios(false)
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || "Erro ao salvar")
    }
  }

  const openEditar = (u: UsuarioResponse) => {
    setEditing(u)
    const fallbackTipo = tiposSelect[0]?.id ?? 0
    setEditForm({
      nome: u.nome,
      email: u.email,
      senha: "",
      tipo_usuario_id: u.tipo_usuario_id && u.tipo_usuario_id > 0 ? u.tipo_usuario_id : fallbackTipo,
    })
    setOpenEdit(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.tipo_usuario_id) {
      return
    }
    criar.mutate(
      {
        nome: form.nome.trim(),
        email: form.email.trim(),
        tipo_usuario_id: form.tipo_usuario_id,
      },
      {
        onSuccess: () => {
          setOpen(false)
          setForm(empty)
        },
      }
    )
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editForm.tipo_usuario_id) return
    const payload: { nome: string; email: string; tipo_usuario_id: number; senha?: string } = {
      nome: editForm.nome.trim(),
      email: editForm.email.trim(),
      tipo_usuario_id: editForm.tipo_usuario_id,
    }
    if (editForm.senha.trim().length > 0) {
      payload.senha = editForm.senha
    }
    atualizar.mutate(
      { id: editing.id, data: payload },
      {
        onSuccess: () => {
          setOpenEdit(false)
          setEditing(null)
        },
      }
    )
  }

  if (!permissoesOk) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900">
        <p className="font-medium">Carregando permissões…</p>
      </div>
    )
  }
  if (!podeEquipe) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900">
        <p className="font-medium">Sem acesso a esta área</p>
        <p className="mt-2 text-amber-800">Redirecionando…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Cadastre médicos e secretárias e defina os dias e horários em que cada um atende — necessário para liberar
            horários na agenda.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários ({usuarios?.length ?? 0})
            </CardTitle>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                checked={incluirInativos}
                onChange={(e) => setIncluirInativos(e.target.checked)}
              />
              Mostrar inativos
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers && <p className="text-sm text-slate-400">Carregando...</p>}
          {!loadingUsers && !usuarios?.length && (
            <p className="text-sm text-slate-500">Nenhum usuário listado.</p>
          )}
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {usuarios?.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{u.nome}</p>
                  <p className="text-slate-500">{u.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      u.ativo ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {u.tipo_usuario || "—"}
                  </span>
                  {podeGerenciar && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => abrirGradeHorarios(u)}
                        title="Dias da semana e horário de trabalho"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Horários
                      </Button>
                    </>
                  )}
                  {podeGerenciar && u.id !== meuId && (
                    <>
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => openEditar(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      {u.ativo ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 text-amber-800 border-amber-200 hover:bg-amber-50"
                          disabled={desativar.isPending}
                          onClick={() => {
                            if (window.confirm(`Desativar o usuário ${u.nome}?`)) {
                              desativar.mutate(u.id)
                            }
                          }}
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Desativar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={reativar.isPending}
                          onClick={() => reativar.mutate(u.id)}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Reativar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="uppercase tracking-wide">Novo usuário na clínica</DialogTitle>
          <DialogDescription className="uppercase text-xs tracking-wide text-slate-600">
            SERÁ GERADA UMA SENHA ALEATÓRIA E ENVIADA AO E-MAIL. NO PRIMEIRO LOGIN A PESSOA DEVERÁ TROCAR A SENHA. O TIPO
            DEFINE O PAPEL (EX.: MÉDICO NA AGENDA).
          </DialogDescription>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome" className="uppercase text-xs tracking-wide">
                Nome *
              </Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="uppercase text-xs tracking-wide">
                E-mail *
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tipo" className="uppercase text-xs tracking-wide">
                Tipo / papel *
              </Label>
              <select
                id="tipo"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={form.tipo_usuario_id || ""}
                onChange={(e) => setForm((p) => ({ ...p, tipo_usuario_id: Number(e.target.value) }))}
                required
                disabled={loadingTipos}
              >
                <option value="">{loadingTipos ? "Carregando..." : "Selecione"}</option>
                {tiposSelect.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.papel || "—"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? "Salvando..." : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openHorarios}
        onOpenChange={(o) => {
          setOpenHorarios(o)
          if (!o) {
            setHorariosUsuarioId(null)
            setHorariosUsuarioNome("")
            setLinhasGrade(linhasGradeIniciais())
            setCapMaxPacientes(1)
            setCapPermiteSimultaneo(false)
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle>Grade de trabalho — {horariosUsuarioNome}</DialogTitle>
          <DialogDescription>
            Marque os dias em que a pessoa atende e o intervalo (formato 24h). A agenda só oferece horários dentro desta
            grade.
          </DialogDescription>
          {horariosQuery.isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Carregando horários…</p>
          ) : (
            <form onSubmit={handleSalvarHorarios} className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                {linhasGrade.map((linha, idx) => (
                  <div
                    key={linha.dia}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-800 shrink-0 min-w-[140px]">
                      <input
                        type="checkbox"
                        checked={linha.trabalha}
                        onChange={(e) => {
                          const v = e.target.checked
                          setLinhasGrade((prev) => {
                            const copy = [...prev]
                            copy[idx] = { ...copy[idx], trabalha: v }
                            return copy
                          })
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {linha.nome}
                    </label>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-slate-500">das</span>
                      <Input
                        type="time"
                        value={linha.inicio}
                        disabled={!linha.trabalha}
                        onChange={(e) => {
                          const v = e.target.value
                          setLinhasGrade((prev) => {
                            const copy = [...prev]
                            copy[idx] = { ...copy[idx], inicio: v }
                            return copy
                          })
                        }}
                        className="w-[132px]"
                      />
                      <span className="text-slate-500">às</span>
                      <Input
                        type="time"
                        value={linha.fim}
                        disabled={!linha.trabalha}
                        onChange={(e) => {
                          const v = e.target.value
                          setLinhasGrade((prev) => {
                            const copy = [...prev]
                            copy[idx] = { ...copy[idx], fim: v }
                            return copy
                          })
                        }}
                        className="w-[132px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-800">Capacidade na agenda</p>
                <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                  <div className="space-y-1">
                    <Label htmlFor="cap-max">Máx. atendimentos no mesmo horário</Label>
                    <Input
                      id="cap-max"
                      type="number"
                      min={1}
                      max={99}
                      value={capMaxPacientes}
                      onChange={(e) => setCapMaxPacientes(Number(e.target.value) || 1)}
                      disabled={!capPermiteSimultaneo}
                      title='Só se aplica quando "Permite simultâneos" está marcado'
                    />
                    <p className="text-xs text-slate-500">
                      Com &quot;Permite simultâneos&quot;, até quantos agendamentos sobrepostos (ex.: grupo).
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 pb-1">
                    <input
                      type="checkbox"
                      checked={capPermiteSimultaneo}
                      onChange={(e) => {
                        const v = e.target.checked
                        setCapPermiteSimultaneo(v)
                        if (!v) setCapMaxPacientes(1)
                      }}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Permite agendamentos simultâneos
                  </label>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Desmarque todos os dias e salve para remover a grade. Início deve ser antes do fim em cada dia marcado.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpenHorarios(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvarHorarios.isPending}>
                  {salvarHorarios.isPending ? "Salvando…" : "Salvar grade e capacidade"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md">
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>Altere nome, e-mail, tipo ou defina uma nova senha (opcional).</DialogDescription>
          <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={editForm.nome}
                onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-email">E-mail *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-senha">Nova senha (opcional)</Label>
              <Input
                id="edit-senha"
                type="password"
                minLength={6}
                value={editForm.senha}
                onChange={(e) => setEditForm((p) => ({ ...p, senha: e.target.value }))}
                placeholder="Deixe em branco para manter"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-tipo">Tipo / papel *</Label>
              <select
                id="edit-tipo"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={editForm.tipo_usuario_id || ""}
                onChange={(e) => setEditForm((p) => ({ ...p, tipo_usuario_id: Number(e.target.value) }))}
                required
                disabled={loadingTipos}
              >
                <option value="">{loadingTipos ? "Carregando..." : "Selecione"}</option>
                {tiposSelect.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.papel || "—"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={atualizar.isPending}>
                {atualizar.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
