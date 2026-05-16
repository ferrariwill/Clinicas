"use client"

import { FormEvent, useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { format, parse, parseISO, formatISO, isBefore, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  AgendaResponse,
  PacienteResponse,
  PreviewAgendaLoteSessao,
  ProcedimentoResponse,
  UsuarioResponse,
} from "@/types/api"
import {
  useAgendaDia,
  useCriarAgenda,
  useAtualizarStatusAgenda,
  useAtualizarProfissionalAgenda,
  usePacientes,
  useProfissionais,
  useProcedimentos,
  useHorariosDisponiveis,
  useCriarAgendaLote,
} from "@/hooks/use-agenda"
import { apiClient } from "@/services/api-client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  ModalActions,
  ModalButton,
  modalIconProps,
} from "@/components/ui/dialog"
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

function podeTrocarMedicoNoCard(status: string) {
  const u = status.toUpperCase()
  return u === "AGENDADO" || u === "CONFIRMADO"
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

const DIAS_SEMANA_LOTE: { valor: number; label: string }[] = [
  { valor: 0, label: "Dom" },
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
  { valor: 6, label: "Sáb" },
]

/** Referências estáveis — `data ?? []` inline recria array a cada render e dispara useEffect em loop. */
const EMPTY_USUARIOS: UsuarioResponse[] = []
const EMPTY_PACIENTES: PacienteResponse[] = []
const EMPTY_PROCEDIMENTOS: ProcedimentoResponse[] = []
const EMPTY_AGENDAMENTOS: AgendaResponse[] = []
const EMPTY_HORARIOS: string[] = []

function usuarioEhMedicoAgenda(u: { tipo_usuario?: string } | null | undefined): boolean {
  if (!u?.tipo_usuario) return false
  const n = u.tipo_usuario
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  return n.includes("MEDICO")
}

export default function AgendaPage() {
  const { usuario, hasPermission } = useAuth()
  const searchParams = useSearchParams()
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState<string>("")
  const [openDialog, setOpenDialog] = useState(false)
  const [pacienteModo, setPacienteModo] = useState<"existente" | "novo">("existente")
  const [novoPaciente, setNovoPaciente] = useState(emptyNovoPaciente)
  const [selectedProcedimentoIds, setSelectedProcedimentoIds] = useState<string[]>([])
  const [formState, setFormState] = useState({
    paciente_id: "",
    usuario_id: "",
    time: "",
  })
  const [modoAgenda, setModoAgenda] = useState<"unico" | "lote">("unico")
  const [loteQuantidade, setLoteQuantidade] = useState(10)
  const [loteDiasSemana, setLoteDiasSemana] = useState<number[]>([1, 3])
  const [loteHora, setLoteHora] = useState("14:00")
  const [loteDataReferencia, setLoteDataReferencia] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [loteSessoes, setLoteSessoes] = useState<PreviewAgendaLoteSessao[]>([])
  const [lotePreviewPending, setLotePreviewPending] = useState(false)

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

  const isMedicoNaAgenda = useMemo(() => usuarioEhMedicoAgenda(usuario), [usuario])

  useEffect(() => {
    if (!isMedicoNaAgenda || !usuario?.id) return
    setSelectedProfessional(usuario.id)
    setFormState((s) => ({ ...s, usuario_id: usuario.id }))
  }, [isMedicoNaAgenda, usuario?.id])

  useEffect(() => {
    if (!openDialog || !isMedicoNaAgenda || !usuario?.id) return
    setFormState((s) =>
      s.usuario_id === usuario.id ? s : { ...s, usuario_id: usuario.id, time: "" }
    )
  }, [openDialog, isMedicoNaAgenda, usuario?.id])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedDate = new Date(selectedDay)
  selectedDate.setHours(0, 0, 0, 0)
  /** Ninguém agenda em datas passadas (regra de negócio + bloqueio no front). */
  /** Só bloqueia criação de novo agendamento; o calendário pode ir a datas passadas para consultar histórico. */
  const isPastDateRestricted = selectedDate < today
  const podeTrocarProfissionalAgenda = hasPermission(["SECRETARIA", "DONO", "DONO_CLINICA", "ADM_GERAL"])

  const dateString = format(selectedDay, "yyyy-MM-dd")
  const profissionaisQuery = useProfissionais()
  const pacientesQuery = usePacientes()
  const profissionais = profissionaisQuery.data ?? EMPTY_USUARIOS
  const espFiltroProcedimentosAgenda = useMemo(() => {
    if (!openDialog) return undefined
    if (isMedicoNaAgenda) {
      const e = (usuario?.especialidade ?? "").trim().toUpperCase()
      return e || undefined
    }
    if (!formState.usuario_id) return undefined
    const prof = profissionais.find((p) => p.id === formState.usuario_id)
    const e = (prof?.especialidade ?? "").trim().toUpperCase()
    return e || undefined
  }, [openDialog, isMedicoNaAgenda, usuario?.especialidade, formState.usuario_id, profissionais])
  const procedimentosQuery = useProcedimentos(espFiltroProcedimentosAgenda)
  const agendaFiltroProfissional = isMedicoNaAgenda ? usuario?.id : selectedProfessional || undefined
  const agendaQuery = useAgendaDia(dateString, agendaFiltroProfissional || undefined)
  const criarAgenda = useCriarAgenda()
  const criarAgendaLote = useCriarAgendaLote()
  const marcarFalta = useAtualizarStatusAgenda()
  const trocarProfissional = useAtualizarProfissionalAgenda()

  const pacientes = pacientesQuery.data ?? EMPTY_PACIENTES
  const procedimentos = procedimentosQuery.data ?? EMPTY_PROCEDIMENTOS
  const agendamentos = agendaQuery.data ?? EMPTY_AGENDAMENTOS

  useEffect(() => {
    if (!openDialog || procedimentos.length === 0) return
    const ids = new Set(procedimentos.map((p) => p.id))
    setSelectedProcedimentoIds((prev) => {
      const next = prev.filter((id) => ids.has(id))
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev
      return next
    })
  }, [openDialog, procedimentos])

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
    enabled: openDialog && modoAgenda === "unico",
  })

  useEffect(() => {
    if (openDialog) {
      setLoteDataReferencia(format(selectedDay, "yyyy-MM-dd"))
    }
  }, [openDialog, selectedDay])

  async function resolverPacienteOuCriar(): Promise<string | null> {
    if (pacienteModo === "existente") {
      if (!formState.paciente_id) {
        toast.error("Selecione um paciente")
        return null
      }
      return formState.paciente_id
    }
    if (!novoPaciente.nome.trim() || !novoPaciente.cpf.trim()) {
      toast.error("Nome e CPF são obrigatórios para novo paciente")
      return null
    }
    try {
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
      const pacienteId = String(nid ?? "")
      if (!pacienteId) {
        toast.error("Paciente criado mas ID não retornado pela API")
        return null
      }
      setPacienteModo("existente")
      setFormState((p) => ({ ...p, paciente_id: pacienteId }))
      await pacientesQuery.refetch()
      toast.success("Paciente cadastrado e selecionado para o agendamento")
      return pacienteId
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 409) {
        toast.error(err.message || "Já existe paciente com este CPF nesta clínica.")
        return null
      }
      toast.error(err?.message || "Erro ao cadastrar paciente")
      return null
    }
  }

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
    setSelectedProcedimentoIds([])
    setModoAgenda("unico")
    setLoteQuantidade(10)
    setLoteDiasSemana([1, 3])
    setLoteHora("14:00")
    setLoteSessoes([])
    setLoteDataReferencia(format(selectedDay, "yyyy-MM-dd"))
  }

  const toggleDiaLote = (d: number) => {
    setLoteDiasSemana((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
      return [...next].sort((a, b) => a - b)
    })
  }

  const handlePreviewLote = async () => {
    if (selectedProcedimentoIds.length === 0) {
      toast.error("Selecione ao menos um procedimento")
      return
    }
    if (!formState.usuario_id) {
      toast.error("Selecione o profissional")
      return
    }
    if (loteDiasSemana.length === 0) {
      toast.error("Marque ao menos um dia da semana")
      return
    }
    const pacienteId = await resolverPacienteOuCriar()
    if (!pacienteId) return
    setLotePreviewPending(true)
    try {
      const res = await apiClient.previewAgendaLote({
        paciente_id: pacienteId,
        usuario_id: formState.usuario_id,
        procedimento_ids: selectedProcedimentoIds,
        quantidade_sessoes: loteQuantidade,
        dias_semana: loteDiasSemana,
        hora: loteHora.trim(),
        data_referencia: loteDataReferencia.trim(),
      })
      const sessoes = res.sessoes ?? []
      setLoteSessoes(sessoes)
      if (sessoes.some((s) => !s.ok)) {
        toast.warning("Alguns horários têm conflito ou estão fora da grade. Ajuste só as linhas necessárias e confirme o lote.")
      } else {
        toast.success("Prévia gerada: todos os horários passaram na validação.")
      }
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      toast.error(err?.message || "Erro ao gerar prévia do lote")
    } finally {
      setLotePreviewPending(false)
    }
  }

  const handleConfirmarLote = async () => {
    if (loteSessoes.length === 0) {
      toast.error('Clique em "Gerar prévia" antes de confirmar o lote.')
      return
    }
    if (!formState.usuario_id) {
      toast.error("Selecione o profissional")
      return
    }
    if (selectedProcedimentoIds.length === 0) {
      toast.error("Selecione ao menos um procedimento")
      return
    }
    const pacienteId = await resolverPacienteOuCriar()
    if (!pacienteId) return
    try {
      await criarAgendaLote.mutateAsync({
        paciente_id: pacienteId,
        usuario_id: formState.usuario_id,
        procedimento_ids: selectedProcedimentoIds,
        sessoes: loteSessoes.map((s) => ({ data_hora: s.data_hora })),
      })
      setOpenDialog(false)
      resetDialog()
    } catch {
      /* toast em useCriarAgendaLote */
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (modoAgenda === "lote") return

    if (!formState.usuario_id || !formState.time) {
      toast.error("Selecione profissional e horário")
      return
    }
    if (selectedProcedimentoIds.length === 0) {
      toast.error("Selecione ao menos um procedimento")
      return
    }

    const pacienteId = await resolverPacienteOuCriar()
    if (!pacienteId) return

    const [yy, mo, da] = dateString.split("-").map(Number)
    const [hh, mi] = formState.time.split(":").map(Number)
    const inicioLocal = new Date(yy, mo - 1, da, hh, mi, 0, 0)
    const data_horario = formatISO(inicioLocal)

    if (isPastDateRestricted) {
      toast.error("Não é permitido criar agendamentos em datas anteriores a hoje.")
      return
    }
    const agora = new Date()
    if (isBefore(inicioLocal, agora)) {
      toast.error("Escolha um horário igual ou posterior ao horário atual (não é permitido agendar no passado).")
      return
    }

    try {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-600 max-w-2xl">
            {isMedicoNaAgenda
              ? "Veja a sua agenda do dia selecionado e navegue no calendário para consultar atendimentos futuros (ou passados). Novos horários e remarcações são feitos pela secretaria ou pela gestão da clínica."
              : "Visualize e gerencie os agendamentos do dia. Cadastre paciente aqui quando precisar; procedimentos são mantidos em Procedimentos."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-[180px]">
            {isMedicoNaAgenda ? (
              <>
                <label className="block text-sm font-medium text-slate-700">Sua agenda</label>
                <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800">
                  Exibindo apenas os <strong>seus</strong> agendamentos ({usuario?.nome ?? "médico"}). Altere a data no
                  calendário ao lado para ver outros dias.
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {isMedicoNaAgenda ? (
              <div className="max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <strong className="font-semibold">Somente visualização:</strong> você vê a sua agenda e pode navegar no
                calendário para os seus atendimentos em outras datas. <strong>Não é possível criar</strong> novos
                agendamentos neste perfil — isso é feito pela <strong>secretaria</strong> ou pela <strong>gestão da
                clínica</strong>. Peça à recepção para marcar ou remarcar. Ao registrar um retorno no prontuário, o
                sistema gera um resumo para a recepção agendar.
              </div>
            ) : (
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
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>Criar Agendamento</DialogTitle>
                <DialogDescription>
                  {searchParams.get("paciente_nome")
                    ? `Paciente sugerido: ${searchParams.get("paciente_nome")}`
                    : "Fluxo: procedimentos cadastrados em Procedimentos, depois paciente, profissional e horário da grade."}
                </DialogDescription>

                <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-800">
                    <input
                      type="radio"
                      name="modo-agenda"
                      checked={modoAgenda === "unico"}
                      onChange={() => {
                        setModoAgenda("unico")
                        setLoteSessoes([])
                      }}
                    />
                    Um horário
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-800">
                    <input
                      type="radio"
                      name="modo-agenda"
                      checked={modoAgenda === "lote"}
                      onChange={() => {
                        setModoAgenda("lote")
                        setFormState((s) => ({ ...s, time: "" }))
                        setLoteSessoes([])
                      }}
                    />
                    Pacote (várias sessões)
                  </label>
                </div>

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
                          Nenhum procedimento cadastrado — cadastre em Procedimentos.
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
                    {isMedicoNaAgenda ? (
                      <div className="block text-sm font-medium text-slate-700">
                        3. Profissional
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-800">
                          {usuario?.nome ?? "—"} <span className="text-slate-500">(sua agenda)</span>
                        </div>
                      </div>
                    ) : (
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
                    )}

                    {modoAgenda === "unico" ? (
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
                          required={modoAgenda === "unico"}
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
                          {(horariosSlots.data ?? EMPTY_HORARIOS).map((hm, index) => (
                            <option key={`slot-${index}-${hm}`} value={hm}>
                              {hm}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-600">
                        No modo <strong>pacote</strong>, os horários são gerados pela recorrência (dias da semana + hora
                        fixa). Use <strong>Gerar prévia</strong> para validar grade e conflitos antes de confirmar.
                      </div>
                    )}
                  </div>

                  {modoAgenda === "lote" ? (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-sm font-medium text-slate-800">Recorrência do pacote</p>
                      <p className="text-xs text-slate-600">
                        Dias da semana (0 = domingo … 6 = sábado, como no calendário). Ex.: segundas e quartas marque{" "}
                        <strong>Seg</strong> e <strong>Qua</strong>.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DIAS_SEMANA_LOTE.map(({ valor, label }) => (
                          <label
                            key={valor}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              checked={loteDiasSemana.includes(valor)}
                              onChange={() => toggleDiaLote(valor)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label htmlFor="lote-qtd">Sessões</Label>
                          <Input
                            id="lote-qtd"
                            type="number"
                            min={1}
                            max={100}
                            value={loteQuantidade}
                            onChange={(e) => setLoteQuantidade(Number(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="lote-hora">Hora (cada sessão)</Label>
                          <Input
                            id="lote-hora"
                            type="time"
                            value={loteHora.length === 5 ? loteHora : loteHora.slice(0, 5)}
                            onChange={(e) => setLoteHora(e.target.value || "14:00")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="lote-ref">1ª data (referência)</Label>
                          <Input
                            id="lote-ref"
                            type="date"
                            value={loteDataReferencia}
                            onChange={(e) => setLoteDataReferencia(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        disabled={lotePreviewPending}
                        onClick={() => void handlePreviewLote()}
                      >
                        {lotePreviewPending ? "Gerando prévia…" : "Gerar prévia"}
                      </Button>
                      {loteSessoes.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-700">
                            Ajuste apenas as linhas necessárias (ex.: conflito) e confirme o lote.
                          </p>
                          <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white text-sm">
                            <table className="w-full min-w-[320px] border-collapse text-left text-xs">
                              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                                <tr>
                                  <th className="border-b border-slate-200 px-2 py-2">#</th>
                                  <th className="border-b border-slate-200 px-2 py-2">Data/hora</th>
                                  <th className="border-b border-slate-200 px-2 py-2">Status</th>
                                  <th className="border-b border-slate-200 px-2 py-2">Ajustar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loteSessoes.map((sessao, idx) => (
                                  <tr
                                    key={`lote-row-${sessao.indice}-${idx}`}
                                    className={sessao.ok ? "bg-white" : "bg-rose-50/80"}
                                  >
                                    <td className="border-b border-slate-100 px-2 py-1.5 align-middle">{sessao.indice}</td>
                                    <td className="border-b border-slate-100 px-2 py-1.5 align-middle text-slate-800">
                                      {(() => {
                                        try {
                                          return format(parseISO(sessao.data_hora), "EEE dd/MM/yyyy HH:mm", {
                                            locale: ptBR,
                                          })
                                        } catch {
                                          return sessao.data_hora
                                        }
                                      })()}
                                    </td>
                                    <td className="border-b border-slate-100 px-2 py-1.5 align-middle">
                                      {sessao.ok ? (
                                        <span className="text-emerald-700">Ok</span>
                                      ) : (
                                        <span className="text-rose-700" title={sessao.erro}>
                                          Conflito
                                        </span>
                                      )}
                                      {!sessao.ok && sessao.erro ? (
                                        <p className="mt-0.5 max-w-[140px] truncate text-[10px] text-rose-600">
                                          {sessao.erro}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td className="border-b border-slate-100 px-1 py-1 align-middle">
                                      <Input
                                        className="h-8 min-w-[9.5rem] text-[11px]"
                                        type="datetime-local"
                                        value={(() => {
                                          try {
                                            return format(parseISO(sessao.data_hora), "yyyy-MM-dd'T'HH:mm")
                                          } catch {
                                            return ""
                                          }
                                        })()}
                                        onChange={(e) => {
                                          const v = e.target.value
                                          if (!v) return
                                          const d = parse(v, "yyyy-MM-dd'T'HH:mm", new Date())
                                          if (!isValid(d)) return
                                          setLoteSessoes((prev) =>
                                            prev.map((row, j) =>
                                              j === idx
                                                ? { ...row, data_hora: formatISO(d), ok: true, erro: undefined }
                                                : row
                                            )
                                          )
                                        }}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <ModalActions>
                    <ModalButton variant="danger" type="button" onClick={() => setOpenDialog(false)}>
                      Cancelar
                    </ModalButton>
                    {modoAgenda === "unico" ? (
                      <ModalButton variant="primary" type="submit" className="inline-flex" disabled={criarAgenda.isPending}>
                        <Plus {...modalIconProps} />
                        {criarAgenda.isPending ? "Salvando..." : "Agendar"}
                      </ModalButton>
                    ) : (
                      <ModalButton
                        variant="primary"
                        type="button"
                        className="inline-flex"
                        disabled={criarAgendaLote.isPending || loteSessoes.length === 0}
                        onClick={() => void handleConfirmarLote()}
                      >
                        <Plus {...modalIconProps} />
                        {criarAgendaLote.isPending
                          ? "Salvando lote…"
                          : `Confirmar lote (${loteSessoes.length} sessões)`}
                      </ModalButton>
                    )}
                  </ModalActions>
                </form>
              </DialogContent>
            </Dialog>
            )}
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
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/50">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Profissional
                          </p>
                          {podeTrocarProfissionalAgenda && podeTrocarMedicoNoCard(item.status) ? (
                            <select
                              className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                              value={item.usuario_id}
                              disabled={trocarProfissional.isPending}
                              onChange={(e) => {
                                const next = e.target.value
                                if (!next || next === item.usuario_id) return
                                trocarProfissional.mutate({ agendaId: item.id, usuarioId: next })
                              }}
                            >
                              {(profissionais.some((p) => p.id === item.usuario_id)
                                ? profissionais
                                : [
                                    ...profissionais,
                                    {
                                      id: item.usuario_id,
                                      nome: item.usuario_nome || `Profissional #${item.usuario_id}`,
                                      email: "",
                                      tipo_usuario: "",
                                      clinic_id: "",
                                      criado_em: "",
                                    } as UsuarioResponse,
                                  ]
                              ).map((prof, i) => (
                                <option key={`ag-card-prof-${i}-${prof.id}`} value={prof.id}>
                                  {prof.nome}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                              {item.usuario_nome || item.usuario_id}
                            </p>
                          )}
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
