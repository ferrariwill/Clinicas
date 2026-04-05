"use client"

import { FormEvent, useState } from "react"
import { format, parseISO } from "date-fns"
import { AgendaResponse, PacienteResponse, ProcedimentoResponse, UsuarioResponse } from "@/types/api"
import { useAgendaDia, useCriarAgenda, useAtualizarStatusAgenda, usePacientes, useProfissionais, useProcedimentos } from "@/hooks/use-agenda"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { formatPercentage, formatNumber } from "@/lib/utils/formatters"
import { Plus, RefreshCw, CalendarDays, XCircle } from "lucide-react"
import { toast } from "sonner"

const statusStyles: Record<string, string> = {
  AGENDADO: "bg-blue-100 text-blue-700",
  CONFIRMADO: "bg-emerald-100 text-emerald-700",
  FALTOU: "bg-red-100 text-red-700",
  FALTADO: "bg-red-100 text-red-700",
}

function statusLabel(status: string) {
  if (status === "FALTOU" || status === "FALTADO") return "Faltou"
  if (status === "CONFIRMADO") return "Confirmado"
  return "Agendado"
}

const toTimeString = (datetime: string) => {
  try {
    return format(parseISO(datetime), "HH:mm")
  } catch {
    return datetime
  }
}

export default function AgendaPage() {
  const { usuario, hasPermission } = useAuth()
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState<string>("")
  const [openDialog, setOpenDialog] = useState(false)
  const [formState, setFormState] = useState({
    paciente_id: "",
    usuario_id: "",
    procedimento_id: "",
    time: "",
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedDate = new Date(selectedDay)
  selectedDate.setHours(0, 0, 0, 0)
  const isPastDateRestricted = selectedDate < today && !hasPermission(["ADM_GERAL", "DONO_CLINICA"])

  const dateString = format(selectedDay, "yyyy-MM-dd")
  const profissionaisQuery = useProfissionais()
  const pacientesQuery = usePacientes()
  const procedimentosQuery = useProcedimentos()
  const agendaQuery = useAgendaDia(dateString, selectedProfessional || undefined)
  const criarAgenda = useCriarAgenda()
  const marcarFalta = useAtualizarStatusAgenda()

  const profissionais: UsuarioResponse[] = profissionaisQuery.data ?? []
  const pacientes: PacienteResponse[] = pacientesQuery.data ?? []
  const procedimentos: ProcedimentoResponse[] = procedimentosQuery.data ?? []
  const agendamentos: AgendaResponse[] = agendaQuery.data ?? []

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formState.paciente_id || !formState.usuario_id || !formState.procedimento_id || !formState.time) {
      toast.error("Preencha todos os campos do agendamento")
      return
    }

    const data_horario = `${dateString}T${formState.time}:00`

    if (isPastDateRestricted) {
      toast.error("Não é permitido criar agendamentos em datas anteriores a hoje.")
      return
    }

    criarAgenda.mutate(
      {
        paciente_id: formState.paciente_id,
        usuario_id: formState.usuario_id,
        procedimento_id: formState.procedimento_id,
        data_horario,
      },
      {
        onError: (error: any) => {
          if (error?.status === 409) {
            toast.error(
              "Conflito de agenda: este profissional já possui um atendimento agendado neste horário."
            )
            return
          }
          toast.error(error?.message || "Erro ao criar agendamento")
        },
        onSuccess: () => {
          setOpenDialog(false)
          setFormState({ paciente_id: "", usuario_id: "", procedimento_id: "", time: "" })
        },
      }
    )
  }

  const handleMarkNoShow = async (agendaId: string) => {
    marcarFalta.mutate(
      { agendaId, statusId: "FALTOU" },
      {
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao marcar falta")
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agenda Médica</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Visualize e gerencie os agendamentos do dia para a clínica selecionada.
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
              {profissionais.map((profissional) => (
                <option key={profissional.id} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  className="inline-flex items-center gap-2"
                  disabled={isPastDateRestricted}
                  title={isPastDateRestricted ? "Não é permitido agendar em datas anteriores a hoje." : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Criar Agendamento</DialogTitle>
                <DialogDescription>
                  Preencha os dados e selecione a hora para marcar um novo atendimento.
                </DialogDescription>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {isPastDateRestricted && (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                      Não é permitido criar agendamentos em datas anteriores a hoje com o seu perfil.
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Paciente
                      <select
                        value={formState.paciente_id}
                        onChange={(event) => setFormState({ ...formState, paciente_id: event.target.value })}
                        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        required
                      >
                        <option value="">Selecione</option>
                        {pacientes.map((paciente) => (
                          <option key={paciente.id} value={paciente.id}>
                            {paciente.nome}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Profissional
                      <select
                        value={formState.usuario_id}
                        onChange={(event) => setFormState({ ...formState, usuario_id: event.target.value })}
                        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        required
                      >
                        <option value="">Selecione</option>
                        {profissionais.map((profissional) => (
                          <option key={profissional.id} value={profissional.id}>
                            {profissional.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Procedimento
                      <select
                        value={formState.procedimento_id}
                        onChange={(event) => setFormState({ ...formState, procedimento_id: event.target.value })}
                        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        required
                      >
                        <option value="">Selecione</option>
                        {procedimentos.map((procedimento) => (
                          <option key={procedimento.id} value={procedimento.id}>
                            {procedimento.nome}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Horário
                      <input
                        type="time"
                        value={formState.time}
                        onChange={(event) => setFormState({ ...formState, time: event.target.value })}
                        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" onClick={() => setOpenDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" />
                      Agendar
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
                      (agendamentos.filter((item) => item.status === "FALTOU" || item.status === "FALTADO").length * 100) /
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
                <CardTitle>Agendamentos de {format(selectedDay, "dd/MM/yyyy")}</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => agendaQuery.refetch()}
                disabled={agendaQuery.isLoading}
                className="inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {agendaQuery.isLoading && (
                <div className="space-y-3">
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </div>
              )}

              {!agendaQuery.isLoading && agendamentos.length === 0 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  Nenhum agendamento encontrado nesta data.
                </div>
              )}

              {!agendaQuery.isLoading && agendamentos.length > 0 && (
                <div className="space-y-4">
                  {agendamentos.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.paciente_id}</p>
                          <p className="mt-1 text-sm text-slate-500">{toTimeString(item.data_horario)}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status] ?? "bg-slate-100 text-slate-700"}`}>
                          {statusLabel(item.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Profissional</p>
                          <p className="mt-1 text-sm text-slate-900">{item.usuario_id}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Procedimento</p>
                          <p className="mt-1 text-sm text-slate-900">{item.procedimento_id}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paciente</p>
                          <p className="mt-1 text-sm text-slate-900">{item.paciente_id}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-500">Clínica: {usuario?.clinic_id}</div>
                        {(item.status !== "FALTOU" && item.status !== "FALTADO") && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleMarkNoShow(item.id)}
                            className="inline-flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Marcar Falta
                          </Button>
                        )}
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