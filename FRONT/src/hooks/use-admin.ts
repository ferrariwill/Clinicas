import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { toast } from "sonner"

// ── Clínicas ──────────────────────────────────────────────────────────────────

export interface ClinicaAdmin {
  id: number
  nome: string
  documento: string
  email_responsavel: string
  nome_responsavel: string
  telefone: string
  endereco: string
  ativa: boolean
  capacidade: number
  created_at: string
}

/** API Go (sem tags json) envia PascalCase; normaliza para o front. */
function mapClinicaAdmin(raw: Record<string, unknown>): ClinicaAdmin {
  const id = raw.id ?? raw.ID
  const nome = raw.nome ?? raw.Nome
  const documento = raw.documento ?? raw.Documento ?? raw.cnpj ?? raw.CNPJ
  const email = raw.email_responsavel ?? raw.EmailResponsavel
  const nomeResponsavel = raw.nome_responsavel ?? raw.NomeResponsavel
  const telefone = raw.telefone ?? raw.Telefone
  const endereco = raw.endereco ?? raw.Endereco
  const ativa = raw.ativa ?? raw.Ativa
  const capacidade = raw.capacidade ?? raw.Capacidade
  const created = raw.created_at ?? raw.CreatedAt
  return {
    id: Number(id),
    nome: typeof nome === "string" ? nome : "",
    documento: typeof documento === "string" ? documento : "",
    email_responsavel: typeof email === "string" ? email : "",
    nome_responsavel: typeof nomeResponsavel === "string" ? nomeResponsavel : "",
    telefone: typeof telefone === "string" ? telefone : "",
    endereco: typeof endereco === "string" ? endereco : "",
    ativa: Boolean(ativa),
    capacidade: typeof capacidade === "number" ? capacidade : Number(capacidade) || 0,
    created_at: typeof created === "string" ? created : "",
  }
}

export interface CriarClinicaPayload {
  nome: string
  documento: string
  email_responsavel: string
  nome_responsavel: string
  telefone?: string
  endereco?: string
  ativa: boolean
  plano_id: number
  /** YYYY-MM-DD início da assinatura */
  data_inicio: string
  periodo_assinatura?: "ANUAL" | "SEMESTRAL" | "DEFINIDO"
  periodo_meses?: number | null
  data_fim?: string | null
}

export const useAdminClinicas = () =>
  useQuery<ClinicaAdmin[]>({
    queryKey: ["admin-clinicas"],
    queryFn: async () => {
      const res = await apiClient.getAxiosInstance().get("/admin/clinicas")
      const list = (res.data.clinicas ?? res.data ?? []) as Record<string, unknown>[]
      return Array.isArray(list) ? list.map(mapClinicaAdmin) : []
    },
  })

export const useCriarClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CriarClinicaPayload) =>
      apiClient.getAxiosInstance().post("/clinicas", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Clínica criada com sucesso!")
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] })
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao criar clínica")
    },
  })
}

export const useToggleClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativa }: { id: number; ativa: boolean }) => {
      const ax = apiClient.getAxiosInstance()
      return ativa
        ? ax.put(`/clinicas/${id}/reativar`, {}).then((r) => r.data)
        : ax.delete(`/clinicas/${id}`).then((r) => r.data)
    },
    onSuccess: () => {
      toast.success("Status da clínica atualizado!")
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] })
    },
  })
}

// ── Usuários (todos) ──────────────────────────────────────────────────────────

export interface UsuarioAdmin {
  id: number
  nome: string
  email: string
  tipo_usuario: string
  ativo: boolean
  clinica_id: number
  created_at: string
}

function mapUsuarioAdmin(raw: Record<string, unknown>): UsuarioAdmin {
  const id = raw.id ?? raw.ID
  const nome = raw.nome ?? raw.Nome
  const email = raw.email ?? raw.Email
  const ativo = raw.ativo ?? raw.Ativo
  const clinicaId = raw.clinica_id ?? raw.ClinicaID
  const created = raw.created_at ?? raw.CreatedAt

  let tipoUsuario: string = ""
  const nested = raw.TipoUsuario as Record<string, unknown> | undefined
  if (nested && typeof nested === "object") {
    if (typeof nested.Papel === "string" && nested.Papel) tipoUsuario = nested.Papel
    else if (typeof nested.Nome === "string") tipoUsuario = nested.Nome
  }
  if (!tipoUsuario && typeof raw.tipo_usuario === "string") tipoUsuario = raw.tipo_usuario

  return {
    id: Number(id),
    nome: typeof nome === "string" ? nome : "",
    email: typeof email === "string" ? email : "",
    tipo_usuario: tipoUsuario,
    ativo: Boolean(ativo),
    clinica_id: Number(clinicaId),
    created_at: typeof created === "string" ? created : "",
  }
}

export const useAdminUsuarios = () =>
  useQuery<UsuarioAdmin[]>({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const res = await apiClient.getAxiosInstance().get("/admin/usuarios", {
        params: { ativos: true },
      })
      const list = (res.data.usuarios ?? res.data ?? []) as Record<string, unknown>[]
      return Array.isArray(list) ? list.map(mapUsuarioAdmin) : []
    },
  })

// ── Planos ────────────────────────────────────────────────────────────────────

export interface Plano {
  id: number
  nome: string
  descricao: string
  valor: number
  limite_usuarios: number
  ativo: boolean
}

function mapPlano(raw: Record<string, unknown>): Plano {
  const id = raw.id ?? raw.ID
  const nome = raw.nome ?? raw.Nome
  const descricao = raw.descricao ?? raw.Descricao
  const valorRaw = raw.valor ?? raw.Valor ?? raw.valor_mensal ?? raw.ValorMensal
  const limite = raw.limite_usuarios ?? raw.LimiteUsuarios
  const ativo = raw.ativo ?? raw.Ativo
  const valor = typeof valorRaw === "number" ? valorRaw : Number(valorRaw) || 0
  return {
    id: Number(id),
    nome: typeof nome === "string" ? nome : "",
    descricao: typeof descricao === "string" ? descricao : "",
    valor,
    limite_usuarios: typeof limite === "number" ? limite : Number(limite) || 0,
    ativo: Boolean(ativo),
  }
}

export interface CriarPlanoPayload {
  nome: string
  descricao: string
  valor: number
  limite_usuarios: number
  ativo: boolean
}

export const usePlanos = () =>
  useQuery<Plano[]>({
    queryKey: ["admin-planos"],
    queryFn: async () => {
      const res = await apiClient.getAxiosInstance().get("/admin/planos/Listar")
      const data = res.data
      const list = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
      return list.map(mapPlano)
    },
  })

export const useCriarPlano = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CriarPlanoPayload) =>
      apiClient.getAxiosInstance().post("/admin/planos/Criar", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Plano criado com sucesso!")
      qc.invalidateQueries({ queryKey: ["admin-planos"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao criar plano")
    },
  })
}

// ── Assinaturas ───────────────────────────────────────────────────────────────

export interface Assinatura {
  id: number
  clinica_id: number
  plano_id: number
  ativa: boolean
  data_inicio: string
  data_expiracao: string | null
}

function mapAssinatura(raw: Record<string, unknown>): Assinatura {
  const id = raw.id ?? raw.ID
  const clinicaId = raw.clinica_id ?? raw.ClinicaID
  const planoId = raw.plano_id ?? raw.PlanoID
  const ativa = raw.ativa ?? raw.Ativa
  const di = raw.data_inicio ?? raw.DataInicio
  const de = raw.data_expiracao ?? raw.DataExpiracao
  let dataExpiracao: string | null = null
  if (de != null && typeof de === "string") dataExpiracao = de
  return {
    id: Number(id),
    clinica_id: Number(clinicaId),
    plano_id: Number(planoId),
    ativa: Boolean(ativa),
    data_inicio: typeof di === "string" ? di : "",
    data_expiracao: dataExpiracao,
  }
}

export interface CriarAssinaturaPayload {
  clinica_id: number
  plano_id: number
  data_inicio: string
  periodo_assinatura?: "ANUAL" | "SEMESTRAL" | "DEFINIDO"
  periodo_meses?: number | null
  data_fim: string | null
}

export const useAssinaturas = () =>
  useQuery<Assinatura[]>({
    queryKey: ["admin-assinaturas"],
    queryFn: async () => {
      const res = await apiClient.getAxiosInstance().get("/admin/assinaturas")
      const data = res.data
      const list = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
      return list.map(mapAssinatura)
    },
  })

export const useCriarAssinatura = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CriarAssinaturaPayload) =>
      apiClient.getAxiosInstance().post("/admin/assinaturas", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Assinatura criada com sucesso!")
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] })
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao criar assinatura")
    },
  })
}
