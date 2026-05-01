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

/** Corpo para PUT /clinicas/:id — API usa `models.Clinica` sem tags JSON (PascalCase). */
export interface AtualizarClinicaBody {
  Nome: string
  Documento: string
  EmailResponsavel: string
  NomeResponsavel: string
  Telefone: string
  Endereco: string
  Capacidade: number
  Ativa: boolean
}

export const useAdminClinicaConfiguracao = (clinicaId: number | null, enabled: boolean) =>
  useQuery<Record<string, unknown>>({
    queryKey: ["admin-clinica-config", clinicaId],
    queryFn: async () => {
      if (clinicaId == null || clinicaId <= 0) return {}
      const res = await apiClient.getAxiosInstance().get(`/admin/clinicas/${clinicaId}/configuracoes`)
      return (res.data ?? {}) as Record<string, unknown>
    },
    enabled: enabled && clinicaId != null && clinicaId > 0,
  })

export const useAtualizarAdminClinicaConfiguracao = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      clinicaId,
      body,
    }: {
      clinicaId: number
      body: Record<string, string | number | boolean | null | undefined>
    }) =>
      apiClient.getAxiosInstance().put(`/admin/clinicas/${clinicaId}/configuracoes`, body).then((r) => r.data),
    onSuccess: (_data, vars) => {
      toast.success("Configuração de cobrança salva.")
      qc.invalidateQueries({ queryKey: ["admin-clinica-config", vars.clinicaId] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; response?: { data?: { erro?: string } } }
      toast.error(err.response?.data?.erro || err.message || "Erro ao salvar configuração")
    },
  })
}

export const useAtualizarClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AtualizarClinicaBody }) =>
      apiClient.getAxiosInstance().put(`/clinicas/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      toast.success("Dados da clínica atualizados!")
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; response?: { data?: { erro?: string } } }
      const msg = err.response?.data?.erro || err.message || "Erro ao atualizar clínica"
      toast.error(msg)
    },
  })
}

/** Assinatura ativa mais recente da clínica; se não houver ativa, a mais recente. */
export function assinaturaPrincipalDaClinica(
  assinaturas: Assinatura[] | undefined,
  clinicaId: number
): Assinatura | undefined {
  if (!assinaturas?.length) return undefined
  const daClinica = assinaturas.filter((a) => a.clinica_id === clinicaId).sort((a, b) => b.id - a.id)
  const ativa = daClinica.find((a) => a.ativa)
  return ativa ?? daClinica[0]
}

export const useAtualizarPlanoClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, plano_id }: { id: number; plano_id: number }) =>
      apiClient.getAxiosInstance().put(`/admin/clinicas/${id}/plano`, { plano_id }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Plano da clínica atualizado!")
      qc.invalidateQueries({ queryKey: ["admin-clinicas"] })
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao atualizar plano")
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
  const nomeBruto = raw.nome ?? raw.Nome
  const nome = typeof nomeBruto === "string" ? nomeBruto.trim() : ""
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
      const res = await apiClient.getAxiosInstance().get("/admin/usuarios")
      const list = (res.data.usuarios ?? res.data ?? []) as Record<string, unknown>[]
      return Array.isArray(list) ? list.map(mapUsuarioAdmin) : []
    },
  })

export interface CriarUsuarioPlataformaPayload {
  nome: string
  email: string
  /** Omitido: API gera senha provisória e envia e-mail (mesmo fluxo da equipe da clínica). */
  senha?: string
}

export const useCriarUsuarioPlataforma = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CriarUsuarioPlataformaPayload) =>
      apiClient.getAxiosInstance().post("/admin/usuarios-plataforma", data).then((r) => r.data),
    onSuccess: (data: { obrigar_troca?: boolean }) => {
      if (data?.obrigar_troca) {
        toast.success("Administrador criado. Foi enviada senha provisória por e-mail (obrigatória troca no 1º acesso).")
      } else {
        toast.success("Administrador da plataforma criado!")
      }
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; response?: { data?: { error?: string } } }
      toast.error(err.response?.data?.error || err.message || "Erro ao criar administrador")
    },
  })
}

export const useToggleUsuarioPlataformaAdmin = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => {
      const ax = apiClient.getAxiosInstance()
      return ativo
        ? ax.put(`/admin/usuarios/${id}/reativar`, {}).then((r) => r.data)
        : ax.delete(`/admin/usuarios/${id}`).then((r) => r.data)
    },
    onSuccess: (_, { ativo }) => {
      toast.success(ativo ? "Usuário reativado." : "Usuário desativado.")
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; response?: { data?: { error?: string } } }
      toast.error(err.response?.data?.error || err.message || "Erro ao atualizar usuário")
    },
  })
}

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

export const useAtualizarPlano = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & CriarPlanoPayload) =>
      apiClient.getAxiosInstance().put(`/admin/planos/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Plano atualizado!")
      qc.invalidateQueries({ queryKey: ["admin-planos"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao atualizar plano")
    },
  })
}

export const useTogglePlanoAtivo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => {
      const ax = apiClient.getAxiosInstance()
      return ativo
        ? ax.delete(`/admin/planos/${id}`).then((r) => r.data)
        : ax.put(`/admin/planos/${id}/reativar`, {}).then((r) => r.data)
    },
    onSuccess: () => {
      toast.success("Status do plano atualizado!")
      qc.invalidateQueries({ queryKey: ["admin-planos"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao alterar plano")
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

export interface AtualizarAssinaturaAdminPayload {
  plano_id?: number
  /** YYYY-MM-DD; string vazia remove a data de fim */
  data_expiracao?: string | null
  ativa?: boolean
}

export const useAtualizarAssinaturaAdmin = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...rest }: { id: number } & AtualizarAssinaturaAdminPayload) => {
      const body: Record<string, unknown> = {}
      if (rest.plano_id !== undefined) body.plano_id = rest.plano_id
      if (rest.data_expiracao !== undefined) body.data_expiracao = rest.data_expiracao
      if (rest.ativa !== undefined) body.ativa = rest.ativa
      return apiClient
        .getAxiosInstance()
        .patch(`/admin/assinaturas/${id}`, body)
        .then((r) => r.data)
    },
    onSuccess: () => {
      toast.success("Assinatura atualizada!")
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao atualizar assinatura")
    },
  })
}
