import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { mapUsuarioProfissionalFromAPI } from "@/hooks/use-agenda"
import type { DefinirHorariosUsuarioRequest, UsuarioHorarioItemResponse, UsuarioResponse } from "@/types/api"
import { toast } from "sonner"

export interface TipoUsuarioClinica {
  id: number
  nome: string
  papel: string
}

function mapTipoUsuario(raw: Record<string, unknown>): TipoUsuarioClinica {
  const id = raw.id ?? raw.ID
  const nome = raw.nome ?? raw.Nome
  const papel = raw.papel ?? raw.Papel
  return {
    id: Number(id),
    nome: typeof nome === "string" ? nome : "",
    papel: typeof papel === "string" ? papel : "",
  }
}

export const useTiposUsuarioClinica = () =>
  useQuery<TipoUsuarioClinica[]>({
    queryKey: ["clinica-tipos-usuario"],
    queryFn: async () => {
      const list = (await apiClient.getTiposUsuarioClinica()) as Record<string, unknown>[]
      return Array.isArray(list) ? list.map(mapTipoUsuario) : []
    },
  })

export const useUsuariosClinica = (incluirInativos = false) =>
  useQuery<UsuarioResponse[]>({
    queryKey: ["clinica-usuarios", incluirInativos],
    queryFn: async () => {
      const response = await apiClient.getUsuarios({ incluirInativos })
      const rawList = (Array.isArray(response) ? response : (response.usuarios ?? [])) as Record<string, unknown>[]
      return rawList.map(mapUsuarioProfissionalFromAPI)
    },
  })

export const useCriarUsuarioClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nome: string; email: string; senha?: string; tipo_usuario_id: number }) =>
      apiClient.criarUsuarioClinica(data),
    onSuccess: (res: unknown) => {
      const r = res as { email_enviado?: boolean }
      if (r?.email_enviado) {
        toast.success("USUÁRIO CRIADO. SENHA PROVISÓRIA ENVIADA POR E-MAIL.")
      } else {
        toast.success("USUÁRIO CRIADO. CONFIGURE SMTP PARA ENVIO AUTOMÁTICO OU USE LOG_TEMP_PASSWORD=TRUE NO BACKEND (DEV).")
      }
      qc.invalidateQueries({ queryKey: ["clinica-usuarios"] })
      qc.invalidateQueries({ queryKey: ["profissionais"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao criar usuário")
    },
  })
}

export const useAtualizarUsuarioClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      data: {
        nome?: string
        email?: string
        senha?: string
        tipo_usuario_id?: number
        max_pacientes?: number
        permite_simultaneo?: boolean
      }
    }) => apiClient.atualizarUsuario(args.id, args.data),
    onSuccess: () => {
      toast.success("Usuário atualizado")
      qc.invalidateQueries({ queryKey: ["clinica-usuarios"] })
      qc.invalidateQueries({ queryKey: ["profissionais"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao atualizar usuário")
    },
  })
}

export const useDesativarUsuarioClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.deletarUsuario(id),
    onSuccess: () => {
      toast.success("Usuário desativado")
      qc.invalidateQueries({ queryKey: ["clinica-usuarios"] })
      qc.invalidateQueries({ queryKey: ["profissionais"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao desativar usuário")
    },
  })
}

export const useReativarUsuarioClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.reativarUsuario(id),
    onSuccess: () => {
      toast.success("Usuário reativado")
      qc.invalidateQueries({ queryKey: ["clinica-usuarios"] })
      qc.invalidateQueries({ queryKey: ["profissionais"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao reativar usuário")
    },
  })
}

function mapHorarioUsuarioFromAPI(raw: Record<string, unknown>): UsuarioHorarioItemResponse {
  const id = raw.id ?? raw.ID
  const uid = raw.usuario_id ?? raw.UsuarioID
  return {
    ...(id != null ? { id: String(id) } : {}),
    ...(uid != null ? { usuario_id: String(uid) } : {}),
    dia_semana: Number(raw.dia_semana ?? raw.DiaSemana ?? 0),
    dia_semana_texto:
      typeof raw.dia_semana_texto === "string"
        ? raw.dia_semana_texto
        : typeof raw.DiaSemanaTexto === "string"
          ? raw.DiaSemanaTexto
          : undefined,
    horario_inicio: String(raw.horario_inicio ?? raw.HorarioInicio ?? "08:00"),
    horario_fim: String(raw.horario_fim ?? raw.HorarioFim ?? "18:00"),
    ativo: Boolean(raw.ativo ?? raw.Ativo ?? true),
  }
}

export const useHorariosUsuarioClinica = (usuarioId: string | undefined, enabled: boolean) =>
  useQuery<UsuarioHorarioItemResponse[]>({
    queryKey: ["usuario-horarios", usuarioId],
    queryFn: async () => {
      const raw = await apiClient.getHorariosUsuario(usuarioId as string)
      const list = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[]
      return list.map(mapHorarioUsuarioFromAPI)
    },
    enabled: Boolean(enabled && usuarioId),
    staleTime: 30 * 1000,
  })

export const useDefinirHorariosUsuarioClinica = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { usuarioId: string; body: DefinirHorariosUsuarioRequest }) =>
      apiClient.definirHorariosUsuario(args.usuarioId, args.body),
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: ["usuario-horarios", args.usuarioId] })
      qc.invalidateQueries({ queryKey: ["horarios-disponiveis"] })
    },
  })
}
