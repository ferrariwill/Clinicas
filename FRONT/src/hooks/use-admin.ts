import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { toast } from "sonner"

// ── Clínicas ──────────────────────────────────────────────────────────────────

export interface ClinicaAdmin {
  id: number
  nome: string
  cnpj: string
  email_responsavel: string
  ativa: boolean
  capacidade: number
  created_at: string
}

export interface CriarClinicaPayload {
  nome: string
  cnpj: string
  email_responsavel: string
  ativa: boolean
}

export const useAdminClinicas = () =>
  useQuery<ClinicaAdmin[]>({
    queryKey: ["admin-clinicas"],
    queryFn: async () => {
      const res = await apiClient.getAxiosInstance().get("/admin/clinicas")
      return res.data.clinicas ?? res.data ?? []
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
    mutationFn: ({ id, ativa }: { id: number; ativa: boolean }) =>
      apiClient.getAxiosInstance()
        .put(`/clinicas/${id}/${ativa ? "reativar" : ""}`, {})
        .then((r) => r.data),
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

export const useAdminUsuarios = () =>
  useQuery<UsuarioAdmin[]>({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const res = await apiClient.getAxiosInstance().get("/admin/usuarios")
      return res.data.usuarios ?? res.data ?? []
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
      return res.data ?? []
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

export interface CriarAssinaturaPayload {
  clinica_id: number
  plano_id: number
  data_inicio: string
  data_fim: string | null
}

export const useAssinaturas = () =>
  useQuery<Assinatura[]>({
    queryKey: ["admin-assinaturas"],
    queryFn: async () => {
      const res = await apiClient.getAxiosInstance().get("/admin/assinaturas")
      return res.data ?? []
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
