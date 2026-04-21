"use client"

import { FormEvent, useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { format, parse, parseISO, formatISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AgendaResponse, PacienteResponse, ProcedimentoResponse, UsuarioResponse } from "@/types/api"
import {
  useAgendaDia,
  useCriarAgenda,
  useAtualizarStatusAgenda,
  usePacientes,
  useProfissionais,
  useProcedimentos,
  useCriarProcedimento,
  useHorariosDisponiveis,
} from "@/hooks/use-agenda"
import { apiClient } from "@/services/api-client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPercentage, formatNumber } from "@/lib/utils/formatters"
import {
  maskCPF,
  maskPhoneBR,
  maskDataBR,
  dataBRToISO,
  maskMoedaBRL,
  parseMoedaBRL,
  maskMinutosConsulta,
} from "@/lib/utils/masks"
import { Plus, RefreshCw, CalendarDays, XCircle, Play, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

const statusStyles: Record<string, string> = {
  AGENDADO: "bg-blue-100 text-blue-700",
  CONFIRMADO: "bg-emerald-100 text-emerald-700",
  "EM ATENDIMENTO": "bg-amber-100 text-amber-800",
  REALIZADO: "bg-slate-200 text-slate-800",
  CANCELADO: "bg-slate-100 text-slate-600 line-through",
  FALTOU: "bg-red-100 text-red-700",
  FALTADO: "bg-red-100 text-red-700",
  FALTA: "bg-red-100 text-red-700",
}

function statusLabel(status: string) {
  const u = status.toUpperCase()
  if (u === "FALTOU" || u === "FALTADO" || u === "FALTA") return "Faltou"
  if (u === "CONFIRMADO") return "Confirmado"
  if (u === "AGENDADO") return "Agendado"
  if (u === "EM ATENDIMENTO") return "Em atendimento"
  if (u === "REALIZADO") return "Realizado"
  if (u === "CANCELADO") return "Cancelado"
  return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : "—"
}

const toTimeString = (datetime: string) => {
  try {
    return format(parseISO(datetime), "HH:mm", { locale: ptBR })
  } catch {
    return datetime
  }
}

const emptyNovoPaciente = {
  nome: "",
  cpf: "",
  data_nascimento: "",
  telefone: "",
  email: "",
}

const emptyNovoProc = {
  nome: "",
  duracaoMinStr: "30",
  valorBRL: "",
}

export default function AgendaPage() {
  const { usuario, hasPermission } = useAuth()
  const searchParams = useSearchParams()
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState<string>("")
  const [openDialog, setOpenDialog] = useState(false)
  const [pacienteModo, setPacienteModo] = useState<"existente" | "novo">("existente")
  const [novoPaciente, setNovoPaciente] = useState(emptyNovoPaciente)
  const [novoProc, setNovoProc] = useState(emptyNovoProc)
  const [selectedProcedimentoIds, setSelectedProcedimentoIds] = useState<string[]>([])
  const [formState, setFormState] = useState({
    paciente_id: "",
    usuario_id: "",
    time: "",
  })

  useEffect(() => {
    const dataParam = searchParams.get("data")
    if (dataParam) {
      const parsed = parse(dataParam, "yyyy-MM-dd", new Date())
      if (!Number.isNaN(parsed.getTime())) {
        setSelectedDay(parsed)
      }
    }
    const pacienteId = searchParams.get("paciente_id")
    if (pacienteId) {
      setFormState((prev) => ({ ...prev, paciente_id: pacienteId }))
      setPacienteModo("existente")
      setOpenDialog(true)
    }
  }, [searchParams])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedDate = new Date(selectedDay)
  selectedDate.setHours(0, 0, 0, 0)
  /** Ninguém agenda em datas passadas (regra de negócio + bloqueio no front). */
  const isPastDateRestricted = selectedDate < today

  const dateString = format(selectedDay, "yyyy-MM-dd")
  const profissionaisQuery = useProfissionais()
  const pacientesQuery = usePacientes()
  const procedimentosQuery = useProcedimentos()
  const agendaQuery = useAgendaDia(dateString, selectedProfessional || undefined)
  const criarAgenda = useCriarAgenda()
  const criarProcedimento = useCriarProcedimento()
  const marcarFalta = useAtualizarStatusAgenda()

  const profissionais = (profissionaisQuery.data ?? []) as UsuarioResponse[]
  const pacientes = (pacientesQuery.data ?? []) as PacienteResponse[]
  const procedimentos = (procedimentosQuery.data ?? []) as ProcedimentoResponse[]
  const agendamentos = (agendaQuery.data ?? []) as AgendaResponse[]

  const resumoProcedimentos = useMemo(() => {
    const list = procedimentos.filter((p) => selectedProcedimentoIds.includes(p.id))
    const valor = list.reduce((s, p) => s + (p.valor || 0), 0)
    const dur = list.reduce((s, p) => s + (p.duracao_minutos || 0), 0)
    const mediaDur = list.length ? dur / list.length : 0
    return { list, valor, dur, mediaDur }
  }, [procedimentos, selectedProcedimentoIds])

  const primeiroProcedimentoId = selectedProcedimentoIds[0]
  const horariosSlots = useHorariosDisponiveis({
    usuarioId: formState.usuario_id || undefined,
    data: dateString,
    procedimentoId: primeiroProcedimentoId,
    duracaoTotalMin: resumoProcedimentos.dur > 0 ? resumoProcedimentos.dur : undefined,
    enabled: openDialog,
  })

  useEffect(() => {
    if (!openDialog) return
    const slots = horariosSlots.data
    if (!slots?.length) return
    setFormState((s) => {
      if (s.time && slots.includes(s.time)) return s
      return { ...s, time: slots[0] }
    })
  }, [openDialog, horariosSlots.data])

  const toggleProcedimento = (id: string) => {
    setFormState((prev) => ({ ...prev, time: "" }))
    setSelectedProcedimentoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const resetDialog = () => {
    setFormState({ paciente_id: "", usuario_id: "", time: "" })
    setPacienteModo("existente")
    setNovoPaciente(emptyNovoPaciente)
    setNovoProc(emptyNovoProc)
    setSelectedProcedimentoIds([])
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formState.usuario_id || !formState.time) {
      toast.error("Selecione profissional e horário")
      return
    }
    if (selectedProcedimentoIds.length === 0) {
      toast.error("Selecione ao menos um procedimento")
      return
    }
    if (pacienteModo === "existente" && !formState.paciente_id) {
      toast.error("Selecione um paciente")
      return
    }
    if (pacienteModo === "novo") {
      if (!novoPaciente.nome.trim() || !novoPaciente.cpf.trim()) {
        toast.error("Nome e CPF são obrigatórios para novo paciente")
        return
      }
    }

    const [yy, mo, da] = dateString.split("-").map(Number)
    const [hh, mi] = formState.time.split(":").map(Number)
    const data_horario = formatISO(new Date(yy, mo - 1, da, hh, mi, 0, 0))

    if (isPastDateRestricted) {
      toast.error("Não é permitido criar agendamentos em datas anteriores a hoje.")
      return
    }

    try {
      let pacienteId = formState.paciente_id
      if (pacienteModo === "novo") {
        const nascISO = dataBRToISO(novoPaciente.data_nascimento)
        const res = (await apiClient.criarPaciente({
          nome: novoPaciente.nome.trim(),
          cpf: novoPaciente.cpf.trim().replace(/\D/g, ""),
          data_nascimento: nascISO || undefined,
          telefone: (novoPaciente.telefone || "").replace(/\D/g, "") || undefined,
          email: novoPaciente.email || undefined,
        })) as { paciente?: Record<string, unknown> }
        const raw = res?.paciente
        const nid = raw?.id ?? raw?.ID
        pacienteId = String(nid ?? "")
        if (!pacienteId) {
          toast.error("Paciente criado mas ID não retornado pela API")
          return
        }
        toast.success("Paciente cadastrado e selecionado para o agendamento")
        await pacientesQuery.refetch()
      }

      await criarAgenda.mutateAsync({
        paciente_id: pacienteId,
        usuario_id: formState.usuario_id,
        procedimento_ids: selectedProcedimentoIds,
        data_horario,
      })
      setOpenDialog(false)
      resetDialog()
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 409) {
        const msg = (err.message || "").toLowerCase()
        if (msg.includes("cpf")) {
          toast.error(err.message || "Já existe paciente com este CPF nesta clínica.")
        } else if (msg.includes("simultâneos") || msg.includes("simultaneos")) {
          toast.error(err.message || "Limite de atendimentos simultâneos neste horário.")
        } else {
          toast.error("Conflito de agenda: este profissional já possui atendimento neste intervalo.")
        }
        return
      }
      toast.error(err?.message || "Erro ao criar agendamento")
    }
  }

  const handleMarkNoShow = async (agendaId: string) => {
    marcarFalta.mutate({ agendaId, statusId: "FALTOU" })
  }

  const handleQuickProc = () => {
    if (!novoProc.nome.trim()) {
      toast.error("Informe o nome do procedimento")
      return
    }
    const durRaw = parseInt(novoProc.duracaoMinStr.replace(/\D/g, ""), 10)
    const duracao_minutos = Number.isFinite(durRaw) ? Math.min(999, Math.max(5, durRaw)) : 30
    const valorParsed = parseMoedaBRL(novoProc.valorBRL)
    const valor = Number.isFinite(valorParsed) ? Math.max(0, valorParsed) : 0
    criarProcedimento.mutate(
      {
        nome: novoProc.nome.trim(),
        descricao: "",
        duracao_minutos,
        valor,
      },
      {
        onSuccess: () => {
          setNovoProc(emptyNovoProc)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-600 max-w-2xl">
            Visualize e gerencie os agendamentos do dia. Cadastre paciente e procedimento aqui mesmo quando precisar.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-slate-700">Filtrar por profissional</label>
            <select
              value={selectedProfessional}
              onChange={(event) => setSelectedProfessional(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todos</option>
              {profissionais.map((profissional, index) => (
                <option key={`filtro-prof-${index}-${profissional.id}`} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
            </select>
            {!profissionaisQuery.isPending && profissionais.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Nenhum profissional (Médico ou Dono) encontrado. Cadastre usuários com esses papéis na Equipe.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Dialog
              open={openDialog}
              onOpenChange={(open) => {
                setOpenDialog(open)
                if (!open) resetDialog()
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  className="inline-flex items-center gap-2"
                  disabled={isPastDateRestricted}
                  title={isPastDateRestricted ? "Escolha hoje ou uma data futura no calendário." : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogTitle>Criar Agendamento</DialogTitle>
                <DialogDescription>
                  {searchParams.get("paciente_nome")
                    ? `Paciente sugerido: ${searchParams.get("paciente_nome")}`
                    : "Fluxo: procedimentos (e cadastro rápido, se precisar), depois paciente, profissional e horário da grade."}
                </DialogDescription>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {isPastDateRestricted && (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                      Selecione hoje ou uma data futura no calendário. Agendamentos no passado não são permitidos.
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">1. Procedimentos *</p>
                      {!procedimentosQuery.isPending && procedimentos.length === 0 && (
                        <span className="text-xs text-amber-700">
                          Nenhum procedimento cadastrado — use o cadastro rápido abaixo.
                        </span>
                      )}
                    </div>
                    <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                      {procedimentos.map((p, index) => (
                        <label
                          key={`proc-${index}-${p.id}`}
                          className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 bg-white px-2 py-2 text-sm hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedProcedimentoIds.includes(p.id)}
                            onChange={() => toggleProcedimento(p.id)}
                          />
                          <span>
                            <span className="font-medium text-slate-900">{p.nome}</span>
                            <span className="ml-2 text-slate-500">
                              R$ {p.valor.toFixed(2)} · {p.duracao_minutos} min
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedProcedimentoIds.length > 0 && (
                      <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-slate-800">
                        <p>
                          <strong>{resumoProcedimentos.list.length}</strong> procedimento(s) · Valor total:{" "}
                          <strong>R$ {resumoProcedimentos.valor.toFixed(2)}</strong>
                        </p>
                        <p className="mt-1 text-slate-600">
                          Tempo total: <strong>{resumoProcedimentos.dur} min</strong> · Média por procedimento:{" "}
                          <strong>{resumoProcedimentos.mediaDur.toFixed(0)} min</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3 space-y-3">
                    <p className="text-sm font-medium text-slate-800">Cadastro rápido de procedimento</p>
                    <p className="text-xs text-slate-600">
                      Preencha o nome, o tempo de atendimento em minutos e o valor cobrado em reais (formato brasileiro).
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="qp-nome">Nome do procedimento *</Label>
                        <Input
                          id="qp-nome"
                          placeholder="Ex.: Consulta de retorno"
                          value={novoProc.nome}
                          onChange={(e) => setNovoProc((p) => ({ ...p, nome: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="qp-dur">Tempo de atendimento (minutos) *</Label>
                        <Input
                          id="qp-dur"
                          inputMode="numeric"
                          placeholder="Ex.: 30"
                          autoComplete="off"
                          value={novoProc.duracaoMinStr}
                          onChange={(e) =>
                            setNovoProc((p) => ({ ...p, duracaoMinStr: maskMinutosConsulta(e.target.value) }))
                          }
                        />
                        <p className="text-xs text-slate-500">Entre 5 e 999 minutos.</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="qp-valor">Valor do atendimento (R$)</Label>
                        <Input
                          id="qp-valor"
                          inputMode="decimal"
                          placeholder="0,00"
                          autoComplete="off"
                          value={novoProc.valorBRL}
                          onChange={(e) =>
                            setNovoProc((p) => ({ ...p, valorBRL: maskMoedaBRL(e.target.value) }))
                          }
                        />
                        <p className="text-xs text-slate-500">Digite centavos como no cartão (ex.: 150 = R$ 1,50).</p>
                      </div>
                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={criarProcedimento.isPending}
                          onClick={handleQuickProc}
                        >
                          {criarProcedimento.isPending ? "Salvando..." : "Salvar e listar procedimento"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <p className="text-sm font-medium text-slate-800">2. Paciente</p>
                    <div className="flex gap-4 text-sm">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pacmodo"
                          checked={pacienteModo === "existente"}
                          onChange={() => setPacienteModo("existente")}
                        />
                        Já cadastrado
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pacmodo"
                          checked={pacienteModo === "novo"}
                          onChange={() => setPacienteModo("novo")}
                        />
                        Novo paciente
                      </label>
                    </div>
                    {pacienteModo === "existente" ? (
                      <select
                        value={formState.paciente_id}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, paciente_id: event.target.value }))
                        }
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        required={pacienteModo === "existente"}
                      >
                        <option value="">Selecione o paciente</option>
                        {pacientes.map((paciente, index) => (
                          <option key={`pac-${index}-${paciente.id}`} value={paciente.id}>
                            {paciente.nome}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2 space-y-1">
                          <Label htmlFor="np-nome">Nome *</Label>
                          <Input
                            id="np-nome"
                            value={novoPaciente.nome}
                            onChange={(e) => setNovoPaciente((p) => ({ ...p, nome: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="np-cpf">CPF *</Label>
                          <Input
                            id="np-cpf"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="000.000.000-00"
                            value={novoPaciente.cpf}
                            onChange={(e) => setNovoPaciente((p) => ({ ...p, cpf: maskCPF(e.target.value) }))}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="np-nasc">Data de nascimento</Label>
                          <Input
                            id="np-nasc"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="dd/mm/aaaa"
                            value={novoPaciente.data_nascimento}
                            onChange={(e) =>
                              setNovoPaciente((p) => ({ ...p, data_nascimento: maskDataBR(e.target.value) }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="np-tel">Telefone</Label>
                          <Input
                            id="np-tel"
                            inputMode="tel"
                            autoComplete="off"
                            placeholder="(00) 00000-0000"
                            value={novoPaciente.telefone}
                            onChange={(e) =>
                              setNovoPaciente((p) => ({ ...p, telefone: maskPhoneBR(e.target.value) }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="np-email">E-mail</Label>
                          <Input
                            id="np-email"
                            type="email"
                            value={novoPaciente.email}
                            onChange={(e) => setNovoPaciente((p) => ({ ...p, email: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      3. Profissional *
                      <select
                        value={formState.usuario_id}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            usuario_id: event.target.value,
                            time: "",
                          }))
                        }
                        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        required
                      >
                        <option value="">Selecione</option>
                        {profissionais.map((profissional, index) => (
                          <option key={`dialog-prof-${index}-${profissional.id}`} value={profissional.id}>
                            {profissional.nome} ({profissional.papel || profissional.tipo_usuario})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Horário (grade, fuso de Brasília) *
                      {!formState.usuario_id || !primeiroProcedimentoId ? (
                        <p className="mt-1 text-xs font-normal text-slate-500">
                          Selecione ao menos um procedimento acima e o profissional para listar os horários livres.
                        </p>
                      ) : null}
                      {horariosSlots.isFetching ? (
                        <p className="mt-1 text-xs font-normal text-slate-500">Carregando horários…</p>
                      ) : null}
                      {horariosSlots.isError ? (
                        <p className="mt-1 text-xs font-normal text-rose-600">
                          Não foi possível carregar os horários. Tente de novo ou confira a API.
                        </p>
                      ) : null}
                      {!horariosSlots.isFetching &&
                      formState.usuario_id &&
                      primeiroProcedimentoId &&
                      (horariosSlots.data?.length ?? 0) === 0 ? (
                        <p className="mt-1 text-xs font-normal text-amber-700">
                          Nenhum horário livre nesta data (grade não cadastrada para este dia, fora do expediente ou
                          agenda cheia). Ajuste em Equipe → horários do usuário ou escolha outra data.
                        </p>
                      ) : null}
                      <select
                        value={formState.time}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, time: event.target.value }))
                        }
                        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        required
                        disabled={
                          !formState.usuario_id ||
                          !primeiroProcedimentoId ||
                          horariosSlots.isFetching ||
                          (horariosSlots.data?.length ?? 0) === 0
                        }
                      >
                        <option value="">
                          {horariosSlots.isFetching ? "Carregando…" : "Selecione o horário"}
                        </option>
                        {(horariosSlots.data ?? []).map((hm, index) => (
                          <option key={`slot-${index}-${hm}`} value={hm}>
                            {hm}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" onClick={() => setOpenDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex items-center justify-center gap-2" disabled={criarAgenda.isPending}>
                      <Plus className="h-4 w-4" />
                      {criarAgenda.isPending ? "Salvando..." : "Agendar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,380px)_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                Calendário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar selected={selectedDay} onSelect={setSelectedDay} />
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/80">
            <CardHeader>
              <CardTitle className="text-base">Resumo do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Agendamentos</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(agendamentos.length)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">No-Show</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatPercentage(
                      (agendamentos.filter((item) => {
                        const s = item.status.toUpperCase()
                        return s === "FALTOU" || s === "FALTADO" || s === "FALTA"
                      }).length *
                        100) /
                        Math.max(1, agendamentos.length)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Agendamentos de {format(selectedDay, "dd/MM/yyyy", { locale: ptBR })}</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => agendaQuery.refetch()}
                disabled={agendaQuery.isPending}
                className="inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {agendaQuery.isPending && (
                <div className="space-y-3">
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </div>
              )}

              {!agendaQuery.isPending && agendamentos.length === 0 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  Nenhum agendamento encontrado nesta data.
                </div>
              )}

              {!agendaQuery.isPending && agendamentos.length > 0 && (
                <div className="space-y-4">
                  {agendamentos.map((item, index) => (
                    <div key={`agenda-${index}-${item.id}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.paciente_nome || item.paciente_id}</p>
                          <p className="mt-1 text-sm text-slate-500">{toTimeString(item.data_horario)}</p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status.toUpperCase()] ?? "bg-slate-100 text-slate-700"}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Profissional</p>
                          <p className="mt-1 text-sm text-slate-900">{item.usuario_nome || item.usuario_id}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:col-span-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Procedimentos</p>
                          <p className="mt-1 text-sm text-slate-900">
                            {(item.procedimento_nomes && item.procedimento_nomes.length > 0
                              ? item.procedimento_nomes.join(" + ")
                              : item.procedimento_nome) || item.procedimento_id}
                          </p>
                          {(item.valor_total != null || item.duracao_total_minutos != null) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.valor_total != null && <>Total R$ {item.valor_total.toFixed(2)} · </>}
                              {item.duracao_total_minutos != null && <>{item.duracao_total_minutos} min</>}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <div className="mr-auto text-sm text-slate-500 sm:mr-0">Clínica: {usuario?.clinic_id}</div>
                        <div className="flex flex-wrap gap-2">
                          {["AGENDADO", "CONFIRMADO"].includes(item.status.toUpperCase()) && (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={marcarFalta.isPending}
                              onClick={() =>
                                marcarFalta.mutate({ agendaId: item.id, statusId: "Em atendimento" })
                              }
                              className="inline-flex items-center gap-2"
                            >
                              <Play className="h-4 w-4" />
                              Iniciar consulta
                            </Button>
                          )}
                          {item.status.toUpperCase() === "EM ATENDIMENTO" && (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={marcarFalta.isPending}
                              onClick={() =>
                                marcarFalta.mutate({ agendaId: item.id, statusId: "Realizado" })
                              }
                              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Finalizar consulta
                            </Button>
                          )}
                          {(() => {
                            const st = item.status.toUpperCase()
                            const podeFalta =
                              !["FALTOU", "FALTADO", "FALTA", "REALIZADO", "CANCELADO", "EM ATENDIMENTO"].includes(st)
                            return podeFalta ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={marcarFalta.isPending}
                                onClick={() => handleMarkNoShow(item.id)}
                                className="inline-flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Marcar falta
                              </Button>
                            ) : null
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
