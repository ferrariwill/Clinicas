"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { formatISO, isBefore, parseISO, isValid, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarRange, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useProfissionais, useProcedimentos } from "@/hooks/use-agenda"
import { useRegistrarPlanoTratamento } from "@/hooks/use-prontuarios"
import type { PacienteResponse } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Modo = "RETORNO" | "SESSOES"

export interface PlanoTratamentoSectionProps {
  pacienteId: string
  paciente: PacienteResponse | undefined
}

export function PlanoTratamentoSection({ pacienteId, paciente }: PlanoTratamentoSectionProps) {
  const { usuario, userRole } = useAuth()
  const { data: profissionais = [] } = useProfissionais()
  const registrar = useRegistrarPlanoTratamento(pacienteId)

  const isMedicoPuro = userRole === "MEDICO"
  const [modo, setModo] = useState<Modo>("RETORNO")
  const [data, setData] = useState("")
  const [hora, setHora] = useState("09:00")
  const [sessoes, setSessoes] = useState("6")
  const [intervaloDias, setIntervaloDias] = useState("7")
  const [usuarioAgendaId, setUsuarioAgendaId] = useState("")
  const [procedimentoId, setProcedimentoId] = useState("")
  const [observacoes, setObservacoes] = useState("")

  const espProfPlano = useMemo(() => {
    if (isMedicoPuro) return (usuario?.especialidade ?? "").trim().toUpperCase() || undefined
    const prof = profissionais.find((x) => x.id === usuarioAgendaId)
    return (prof?.especialidade ?? "").trim().toUpperCase() || undefined
  }, [isMedicoPuro, usuario?.especialidade, profissionais, usuarioAgendaId])
  const { data: procedimentos = [] } = useProcedimentos(espProfPlano)

  useEffect(() => {
    if (!usuario?.id) return
    if (isMedicoPuro) {
      setUsuarioAgendaId(usuario.id)
      return
    }
    if (!usuarioAgendaId && profissionais.length > 0) {
      const match = profissionais.find((p) => p.id === usuario?.id)
      setUsuarioAgendaId((match ?? profissionais[0]).id)
    }
  }, [usuario?.id, isMedicoPuro, profissionais, usuarioAgendaId])

  useEffect(() => {
    if (procedimentos.length === 0) {
      setProcedimentoId("")
      return
    }
    if (!procedimentoId || !procedimentos.some((p) => p.id === procedimentoId)) {
      setProcedimentoId(procedimentos[0].id)
    }
  }, [procedimentos, procedimentoId])

  const resumoPaciente = useMemo(() => {
    const r = paciente?.plano_retorno_previsto_em
    const n = paciente?.plano_sessoes_previstas
    if (!r && (n == null || !Number.isFinite(n))) return null
    let dataFmt = "—"
    if (r) {
      try {
        const d = parseISO(r)
        if (isValid(d)) dataFmt = format(d, "dd/MM/yyyy HH:mm", { locale: ptBR })
      } catch {
        dataFmt = r
      }
    }
    if (n != null && Number.isFinite(n) && n > 0) {
      return `Último plano no cadastro: ${n} sessão(ões) prevista(s); referência ${dataFmt}.`
    }
    return `Último plano no cadastro: retorno / 1ª sessão em ${dataFmt}.`
  }, [paciente?.plano_retorno_previsto_em, paciente?.plano_sessoes_previstas])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const pid = Number.parseInt(pacienteId, 10)
    const uid = Number.parseInt(usuarioAgendaId, 10)
    const proc = Number.parseInt(procedimentoId, 10)
    if (!Number.isFinite(pid) || pid <= 0 || !Number.isFinite(uid) || uid <= 0 || !Number.isFinite(proc) || proc <= 0) {
      toast.error("Selecione paciente, profissional e procedimento válidos.")
      return
    }
    const parts = data.split("-").map((x) => Number.parseInt(x, 10))
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) {
      toast.error("Informe a data completa.")
      return
    }
    const yy = parts[0]
    const mo = parts[1]
    const da = parts[2]
    const th = hora.split(":").map((x) => Number.parseInt(x, 10))
    const hh = Number.isFinite(th[0]) ? th[0] : 0
    const mi = Number.isFinite(th[1]) ? th[1] : 0
    const inicioLocal = new Date(yy, mo - 1, da, hh, mi, 0, 0)
    const agora = new Date()
    if (isBefore(inicioLocal, agora)) {
      toast.error("Escolha data e horário iguais ou posteriores ao momento atual.")
      return
    }
    const dataHora = formatISO(inicioLocal)
    const nSess = Math.floor(Number.parseInt(sessoes, 10) || 0)
    const intD = Math.floor(Number.parseInt(intervaloDias, 10) || 7)
    const body = {
      modo,
      paciente_id: pid,
      usuario_id: uid,
      procedimento_id: proc,
      data_hora: dataHora,
      intervalo_dias: modo === "SESSOES" ? intD : undefined,
      sessoes_previstas: modo === "SESSOES" ? nSess : undefined,
      observacoes: observacoes.trim() || undefined,
    }
    if (modo === "SESSOES" && (nSess < 1 || nSess > 52)) {
      toast.error("Número de sessões deve ser entre 1 e 52.")
      return
    }
    registrar.mutate(body)
  }

  const submitDisabled =
    registrar.isPending ||
    !data ||
    !usuarioAgendaId ||
    !procedimentoId ||
    (modo === "SESSOES" && (Number.parseInt(sessoes, 10) < 1 || Number.parseInt(sessoes, 10) > 52))

  return (
    <Card className="border-violet-200 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-slate-50">
          <CalendarRange className="h-5 w-5 text-violet-700 dark:text-violet-300" aria-hidden />
          Plano de tratamento
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Registre retorno único ou série de sessões. O sistema grava o plano no prontuário e atualiza lembretes no cadastro
          do paciente. A <strong>secretaria ou a gestão</strong> monta os horários na agenda — ao salvar, aparece um
          resumo para repassar à recepção.
        </p>
        {resumoPaciente && (
          <p className="rounded-lg border border-violet-200 bg-white/80 px-3 py-2 text-xs text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
            {resumoPaciente}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="modo-plano" checked={modo === "RETORNO"} onChange={() => setModo("RETORNO")} />
              Data de retorno (um agendamento)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="modo-plano" checked={modo === "SESSOES"} onChange={() => setModo("SESSOES")} />
              Sessões previstas (vários agendamentos)
            </label>
          </div>

          {!isMedicoPuro && (
            <div className="space-y-1">
              <Label htmlFor="plano-prof">Profissional (agenda)</Label>
              <select
                id="plano-prof"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={usuarioAgendaId}
                onChange={(e) => setUsuarioAgendaId(e.target.value)}
                required
              >
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="plano-proc">Procedimento</Label>
            <select
              id="plano-proc"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              value={procedimentoId}
              onChange={(e) => setProcedimentoId(e.target.value)}
              required
            >
              {procedimentos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="plano-data">{modo === "RETORNO" ? "Data do retorno" : "Data da 1ª sessão"}</Label>
              <Input id="plano-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plano-hora">Horário</Label>
              <Input id="plano-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
            </div>
          </div>

          {modo === "SESSOES" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="plano-n">Número de sessões (1–52)</Label>
                <Input
                  id="plano-n"
                  type="number"
                  min={1}
                  max={52}
                  value={sessoes}
                  onChange={(e) => setSessoes(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plano-int">Intervalo entre sessões (dias)</Label>
                <Input
                  id="plano-int"
                  type="number"
                  min={1}
                  max={60}
                  value={intervaloDias}
                  onChange={(e) => setIntervaloDias(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="plano-obs">Observações (opcional)</Label>
            <textarea
              id="plano-obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Ex.: alongamento domiciliar, trazer exames…"
            />
          </div>

          <Button type="submit" disabled={submitDisabled} className="inline-flex items-center gap-2">
            {registrar.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando…
              </>
            ) : (
              "Salvar plano (secretaria agenda depois)"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
