import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { parseISO, isValid } from "date-fns"
import { apiClient } from "@/services/api-client"
import type {
  AgendaRequest,
  AgendaResponse,
  UsuarioResponse,
  PacienteResponse,
  ProcedimentoResponse,
  ProcedimentoRequest,
} from "@/types/api"
import { toast } from "sonner"

/** Lista /usuarios: `tipo_usuario` vem da tag JSON do modelo; campos internos podem ser PascalCase. */
export function mapUsuarioProfissionalFromAPI(raw: Record<string, unknown>): UsuarioResponse {
  const id = raw.id ?? raw.ID
  const nested = (raw.tipo_usuario ?? raw.TipoUsuario) as Record<string, unknown> | undefined
  let papel = ""
  const nestedPapel = nested ? (nested.Papel ?? nested.papel) : undefined
  if (nested && typeof nestedPapel === "string" && nestedPapel) papel = nestedPapel as string
  else if (typeof raw.tipo_usuario === "string" && !nested) papel = raw.tipo_usuario as string
  const nome = raw.nome ?? raw.Nome
  const email = raw.email ?? raw.Email
  const nestedNome = nested ? (nested.Nome ?? nested.nome) : undefined
  const tipoNome =
    nested && typeof nestedNome === "string" && nestedNome ? (nestedNome as string) : ""
  const tipoUsuarioIdRaw =
    raw.tipo_usuario_id ?? raw.TipoUsuarioID ?? nested?.id ?? nested?.ID
  const tipoUsuarioId =
    typeof tipoUsuarioIdRaw === "number"
      ? tipoUsuarioIdRaw
      : tipoUsuarioIdRaw != null
        ? Number(tipoUsuarioIdRaw)
        : undefined
  return {
    id: String(id ?? ""),
    nome: typeof nome === "string" ? nome : "",
    email: typeof email === "string" ? email : "",
    tipo_usuario: tipoNome || papel,
    papel: papel || undefined,
    tipo_usuario_id: Number.isFinite(tipoUsuarioId) ? tipoUsuarioId : undefined,
    ativo: Boolean(raw.ativo ?? raw.Ativo ?? true),
    max_pacientes: (() => {
      const v = raw.max_pacientes ?? raw.MaxPacientes
      if (typeof v === "number" && Number.isFinite(v)) return v
      if (v != null) {
        const n = Number(v)
        return Number.isFinite(n) ? n : undefined
      }
      return undefined
    })(),
    permite_simultaneo:
      typeof raw.permite_simultaneo === "boolean"
        ? raw.permite_simultaneo
        : typeof raw.PermiteSimultaneo === "boolean"
          ? raw.PermiteSimultaneo
          : undefined,
    clinic_id: String(raw.clinic_id ?? raw.clinica_id ?? raw.ClinicaID ?? ""),
    criado_em:
      typeof raw.criado_em === "string"
        ? raw.criado_em
        : typeof raw.CreatedAt === "string"
          ? raw.CreatedAt
          : "",
  }
}

export function mapProcedimentoFromAPI(raw: Record<string, unknown>): ProcedimentoResponse {
  const id = raw.id ?? raw.ID
  const nome = raw.nome ?? raw.Nome
  const desc = raw.descricao ?? raw.Descricao
  const dur =
    raw.duracao_minutos ??
    raw.duracao_min ??
    raw.Duracao ??
    raw.duracao ??
    raw.DuracaoMin
  const val = raw.valor ?? raw.preco ?? raw.Preco ?? raw.Valor
  return {
    id: String(id ?? ""),
    nome: typeof nome === "string" ? nome : "",
    descricao: typeof desc === "string" ? desc : undefined,
    duracao_minutos: typeof dur === "number" ? dur : Number(dur) || 0,
    valor: typeof val === "number" ? val : Number(val) || 0,
    ativo: Boolean(raw.ativo ?? raw.Ativo ?? true),
    clinic_id: String(raw.clinic_id ?? raw.clinica_id ?? raw.ClinicaID ?? ""),
    criado_em:
      typeof raw.criado_em === "string"
        ? raw.criado_em
        : typeof raw.CreatedAt === "string"
          ? raw.CreatedAt
          : "",
  }
}

/** Lista /pacientes: GORM costuma serializar `ID`, `Nome`, etc. em PascalCase. */
export function mapPacienteFromAPI(raw: Record<string, unknown>): PacienteResponse {
  const id = raw.id ?? raw.ID
  const nome = raw.nome ?? raw.Nome
  const cpf = raw.cpf ?? raw.CPF ?? raw.Cpf
  const dn = raw.data_nascimento ?? raw.DataNascimento ?? raw.data_nasc
  const tel = raw.telefone ?? raw.Telefone
  const email = raw.email ?? raw.Email
  const end = raw.endereco ?? raw.Endereco
  return {
    id: String(id ?? ""),
    nome: typeof nome === "string" ? nome : "",
    cpf: typeof cpf === "string" ? cpf : String(cpf ?? ""),
    data_nascimento: typeof dn === "string" ? dn : undefined,
    telefone: typeof tel === "string" ? tel : undefined,
    email: typeof email === "string" ? email : undefined,
    endereco: typeof end === "string" ? end : undefined,
    clinic_id: String(raw.clinic_id ?? raw.clinica_id ?? raw.ClinicaID ?? ""),
    criado_em:
      typeof raw.criado_em === "string"
        ? raw.criado_em
        : typeof raw.CreatedAt === "string"
          ? raw.CreatedAt
          : "",
  }
}

function num(raw: unknown): string {
  if (raw == null) return ""
  const n = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(n) ? String(n) : ""
}

/** Normaliza resposta da API de agendamento (modelos aninhados). */
export function mapAgendaFromAPI(raw: Record<string, unknown>): AgendaResponse {
  const id = raw.id ?? raw.ID
  const pac = raw.Paciente as Record<string, unknown> | undefined
  const usu = raw.Usuario as Record<string, unknown> | undefined
  const proc = raw.Procedimento as Record<string, unknown> | undefined
  const st = raw.StatusAgendamento as Record<string, unknown> | undefined
  const extras = (raw.ProcedimentosExtras ?? raw.procedimentos_extras) as Record<string, unknown>[] | undefined

  const pid = num(raw.paciente_id ?? raw.PacienteID ?? pac?.id ?? pac?.ID)
  const uid = num(raw.usuario_id ?? raw.UsuarioID ?? usu?.id ?? usu?.ID)
  const prid = num(raw.procedimento_id ?? raw.ProcedimentoID ?? proc?.id ?? proc?.ID)

  const nomes: string[] = []
  const ids: string[] = []
  if (proc && typeof (proc.nome ?? proc.Nome) === "string") {
    nomes.push(String(proc.nome ?? proc.Nome))
    ids.push(prid)
  }
  let valorTotal = 0
  let durTotal = 0
  const pPreco = proc?.preco ?? proc?.Preco ?? proc?.valor
  const pDur = proc?.duracao ?? proc?.Duracao ?? proc?.duracao_minutos
  if (proc) {
    valorTotal += typeof pPreco === "number" ? pPreco : Number(pPreco) || 0
    durTotal += typeof pDur === "number" ? pDur : Number(pDur) || 0
  }
  if (Array.isArray(extras)) {
    for (const row of extras) {
      const p = row.Procedimento as Record<string, unknown> | undefined
      const eid = num(row.procedimento_id ?? row.ProcedimentoID ?? p?.id ?? p?.ID)
      if (eid) ids.push(eid)
      if (p && typeof (p.nome ?? p.Nome) === "string") nomes.push(String(p.nome ?? p.Nome))
      const pv = p?.preco ?? p?.Preco ?? p?.valor
      const pd = p?.duracao ?? p?.Duracao ?? p?.duracao_minutos
      if (p) {
        valorTotal += typeof pv === "number" ? pv : Number(pv) || 0
        durTotal += typeof pd === "number" ? pd : Number(pd) || 0
      }
    }
  }

  const statusNome = typeof st?.nome === "string" ? st.nome : typeof st?.Nome === "string" ? st.Nome : ""

  const dh = raw.data_hora ?? raw.DataHora
  let dataHorario = ""
  if (typeof dh === "string") dataHorario = dh
  else if (dh && typeof dh === "object" && dh !== null && "toISOString" in (dh as object)) {
    dataHorario = (dh as Date).toISOString()
  }

  const libRaw = raw.liberado_cobranca_em ?? raw.LiberadoCobrancaEm
  let liberado_cobranca_em: string | null | undefined
  if (typeof libRaw === "string" && libRaw) liberado_cobranca_em = libRaw
  else if (libRaw && typeof libRaw === "object" && libRaw !== null && "toISOString" in (libRaw as object)) {
    liberado_cobranca_em = (libRaw as Date).toISOString()
  } else {
    liberado_cobranca_em = null
  }

  return {
    id: String(id ?? ""),
    paciente_id: pid,
    paciente_nome: typeof (pac?.nome ?? pac?.Nome) === "string" ? String(pac?.nome ?? pac?.Nome) : undefined,
    usuario_id: uid,
    usuario_nome: typeof (usu?.nome ?? usu?.Nome) === "string" ? String(usu?.nome ?? usu?.Nome) : undefined,
    procedimento_id: prid,
    procedimento_nome: nomes[0],
    procedimento_ids: ids.length ? ids : prid ? [prid] : [],
    procedimento_nomes: nomes.length ? nomes : undefined,
    valor_total: valorTotal > 0 ? valorTotal : undefined,
    duracao_total_minutos: durTotal > 0 ? durTotal : undefined,
    data_horario: dataHorario,
    status: statusNome ? String(statusNome).toUpperCase() : "",
    liberado_cobranca_em,
    criado_em:
      typeof raw.criado_em === "string"
        ? raw.criado_em
        : typeof raw.CreatedAt === "string"
          ? raw.CreatedAt
          : "",
    atualizado_em:
      typeof raw.atualizado_em === "string"
        ? raw.atualizado_em
        : typeof raw.UpdatedAt === "string"
          ? raw.UpdatedAt
          : "",
  }
}

/** HH:mm no relógio de Brasília (independe do fuso do PC; RFC3339 com Z vira hora local correta). */
function formatHHmmAmericaSaoPaulo(d: Date): string {
  if (!isValid(d)) return ""
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d)
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00"
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00"
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
}

function horarioSlotParaHHMM(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const s = raw.trim()
  // API: só "HH:mm" ou "HH:mm:ss" (sem data) — não passar por parseISO.
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s) && !/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [h, m] = s.split(":")
    return `${h.padStart(2, "0")}:${(m || "00").replace(/\D/g, "").slice(0, 2).padStart(2, "0")}`
  }
  try {
    const d = parseISO(s)
    if (!isValid(d)) return null
    return formatHHmmAmericaSaoPaulo(d)
  } catch {
    return null
  }
}

export function useHorariosDisponiveis(opts: {
  usuarioId?: string
  data: string
  procedimentoId?: string
  duracaoTotalMin?: number
  enabled: boolean
}) {
  const { usuarioId, data, procedimentoId, duracaoTotalMin, enabled } = opts
  return useQuery({
    queryKey: ["horarios-disponiveis", usuarioId, data, procedimentoId, duracaoTotalMin ?? 0],
    queryFn: async (): Promise<string[]> => {
      const raw = await apiClient.getHorariosDisponiveis(
        usuarioId as string,
        procedimentoId as string,
        data,
        duracaoTotalMin
      )
      const arr = Array.isArray(raw) ? raw : []
      const seen = new Set<string>()
      const out: string[] = []
      for (const item of arr) {
        const hm = horarioSlotParaHHMM(item)
        if (hm && !seen.has(hm)) {
          seen.add(hm)
          out.push(hm)
        }
      }
      out.sort()
      return out
    },
    enabled: Boolean(enabled && usuarioId && procedimentoId && data),
    staleTime: 30 * 1000,
  })
}

export const useAgendaDia = (data: string, profissionalId?: string) => {
  return useQuery<AgendaResponse[]>({
    queryKey: ["agenda-dia", data, profissionalId],
    queryFn: async (): Promise<AgendaResponse[]> => {
      const result = await apiClient.getAgendamentosDia(data, profissionalId)
      const rawList = (Array.isArray(result) ? result : (result as { agendamentos?: unknown[] }).agendamentos ?? []) as Record<
        string,
        unknown
      >[]
      return rawList.map(mapAgendaFromAPI)
    },
    enabled: Boolean(data),
    staleTime: 60 * 1000,
    retry: 1,
  })
}

export const usePacientes = () => {
  return useQuery<PacienteResponse[]>({
    queryKey: ["pacientes"],
    queryFn: async (): Promise<PacienteResponse[]> => {
      const response = await apiClient.getPacientes()
      const rawList = (Array.isArray(response) ? response : response.pacientes ?? []) as Record<string, unknown>[]
      return rawList.map(mapPacienteFromAPI)
    },
  })
}

function usuarioPodeTerAgenda(u: UsuarioResponse): boolean {
  const p = (u.papel || "").toUpperCase()
  if (p === "MEDICO" || p === "DONO" || p === "DONO_CLINICA") return true
  const tipo = (u.tipo_usuario || "").toLowerCase()
  const norm = tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  if (!p && (norm.includes("medico") || norm.includes("dono"))) return true
  return false
}

export const useProfissionais = () => {
  return useQuery<UsuarioResponse[]>({
    queryKey: ["profissionais"],
    queryFn: async (): Promise<UsuarioResponse[]> => {
      const response = await apiClient.getUsuarios()
      const rawList = (Array.isArray(response) ? response : (response.usuarios ?? [])) as Record<string, unknown>[]
      const usuarios = rawList.map(mapUsuarioProfissionalFromAPI)
      return usuarios.filter((u) => u.ativo !== false && usuarioPodeTerAgenda(u))
    },
  })
}

export const useProcedimentos = () => {
  return useQuery<ProcedimentoResponse[]>({
    queryKey: ["procedimentos"],
    queryFn: async (): Promise<ProcedimentoResponse[]> => {
      const response = await apiClient.getProcedimentos()
      const rawList = (Array.isArray(response) ? response : (response as { procedimentos?: unknown[] }).procedimentos ?? []) as Record<
        string,
        unknown
      >[]
      return rawList.map(mapProcedimentoFromAPI)
    },
  })
}

export const useCriarAgenda = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AgendaRequest) => {
      return await apiClient.criarAgenda(payload)
    },
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso")
      queryClient.invalidateQueries({ queryKey: ["agenda-dia"] })
    },
  })
}

export const useCriarProcedimento = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProcedimentoRequest) => apiClient.criarProcedimento(data),
    onSuccess: () => {
      toast.success("Procedimento cadastrado")
      queryClient.invalidateQueries({ queryKey: ["procedimentos"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao cadastrar procedimento")
    },
  })
}

export const useAtualizarProcedimento = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      id: string
      data: ProcedimentoRequest
      opts?: { convenio_id?: number; ativo?: boolean }
    }) => apiClient.atualizarProcedimento(vars.id, vars.data, vars.opts),
    onSuccess: () => {
      toast.success("Procedimento atualizado")
      queryClient.invalidateQueries({ queryKey: ["procedimentos"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao atualizar procedimento")
    },
  })
}

export const useDesativarProcedimento = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.desativarProcedimento(id),
    onSuccess: () => {
      toast.success("Procedimento desativado")
      queryClient.invalidateQueries({ queryKey: ["procedimentos"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao desativar")
    },
  })
}

export const useReativarProcedimento = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.reativarProcedimento(id),
    onSuccess: () => {
      toast.success("Procedimento reativado")
      queryClient.invalidateQueries({ queryKey: ["procedimentos"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao reativar")
    },
  })
}

export const useAtualizarProfissionalAgenda = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ agendaId, usuarioId }: { agendaId: string; usuarioId: string }) => {
      return await apiClient.atualizarProfissionalAgenda(agendaId, usuarioId)
    },
    onSuccess: () => {
      toast.success("Profissional do agendamento atualizado.")
      queryClient.invalidateQueries({ queryKey: ["agenda-dia"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; response?: { data?: { erro?: string } } }
      toast.error(err.response?.data?.erro || err.message || "Erro ao trocar profissional")
    },
  })
}

export const useAtualizarStatusAgenda = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agendaId, statusId }: { agendaId: string; statusId: string }) => {
      return await apiClient.atualizarStatusAgenda(agendaId, statusId)
    },
    onSuccess: (_data, variables) => {
      const raw = (variables.statusId || "").trim()
      const lower = raw.toLowerCase()
      if (lower === "faltou" || lower === "falta" || lower === "faltado") {
        toast.success("Falta registrada. O índice de no-show foi atualizado.")
      } else if (lower.includes("atendimento")) {
        toast.success("Consulta iniciada.")
      } else if (lower.includes("realizado")) {
        toast.success("Consulta finalizada.")
      } else {
        toast.success("Status atualizado.")
      }
      queryClient.invalidateQueries({ queryKey: ["agenda-dia"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao atualizar status do agendamento")
    },
  })
}

export const useLiberarCobrancaAgenda = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (agendaId: string) => apiClient.liberarCobrancaAgenda(agendaId),
    onSuccess: () => {
      toast.success("Consulta liberada para pagamento na recepção.")
      queryClient.invalidateQueries({ queryKey: ["agenda-dia"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; response?: { data?: { erro?: string } } }
      toast.error(err.response?.data?.erro || err.message || "Não foi possível liberar cobrança")
    },
  })
}
