import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { toast } from "sonner"

export interface TelaCatalogo {
  id: number
  nome: string
  rota: string
  descricao: string
  ativo: boolean
}

export interface TipoUsuarioGestao {
  id: number
  nome: string
  descricao: string
  papel: string
}

export interface PermissaoTelaRow {
  tela_id: number
  tipo_usuario_id?: number
  Tela?: TelaCatalogo & { ID?: number }
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapTela(raw: Record<string, unknown>): TelaCatalogo {
  const id = raw.id ?? raw.ID
  const nome = raw.nome ?? raw.Nome
  const rota = raw.rota ?? raw.Rota
  const descricao = raw.descricao ?? raw.Descricao
  const ativo = raw.ativo ?? raw.Ativo
  return {
    id: num(id),
    nome: typeof nome === "string" ? nome : "",
    rota: typeof rota === "string" ? rota : "",
    descricao: typeof descricao === "string" ? descricao : "",
    ativo: typeof ativo === "boolean" ? ativo : true,
  }
}

function mapTipo(raw: Record<string, unknown>): TipoUsuarioGestao {
  const id = raw.id ?? raw.ID
  const nome = raw.nome ?? raw.Nome
  const descricao = raw.descricao ?? raw.Descricao
  const papel = raw.papel ?? raw.Papel
  return {
    id: num(id),
    nome: typeof nome === "string" ? nome : "",
    descricao: typeof descricao === "string" ? descricao : "",
    papel: typeof papel === "string" ? papel : "",
  }
}

export const useGestaoTelas = () =>
  useQuery<TelaCatalogo[]>({
    queryKey: ["clinica-gestao-telas"],
    queryFn: async () => {
      const list = (await apiClient.getGestaoTelas()) as Record<string, unknown>[]
      return Array.isArray(list) ? list.map(mapTela).filter((t) => t.id > 0) : []
    },
    retry: 1,
  })

export const useGestaoTiposUsuario = () =>
  useQuery<TipoUsuarioGestao[]>({
    queryKey: ["clinica-gestao-tipos"],
    queryFn: async () => {
      const list = (await apiClient.getGestaoTiposUsuario()) as Record<string, unknown>[]
      return Array.isArray(list) ? list.map(mapTipo).filter((t) => t.id > 0) : []
    },
  })

export const useGestaoPermissoesTipo = (tipoUsuarioId: number | null) =>
  useQuery<PermissaoTelaRow[]>({
    queryKey: ["clinica-gestao-permissoes", tipoUsuarioId],
    enabled: tipoUsuarioId != null && tipoUsuarioId > 0,
    queryFn: async () => {
      const list = (await apiClient.getGestaoPermissoesPorTipo(tipoUsuarioId!)) as Record<
        string,
        unknown
      >[]
      if (!Array.isArray(list)) return []
      return list.map((row) => {
        const telaId = row.tela_id ?? row.TelaID ?? (row.Tela as Record<string, unknown>)?.id
        const nested = row.Tela as Record<string, unknown> | undefined
        return {
          tela_id: num(telaId),
          tipo_usuario_id: num(row.tipo_usuario_id ?? row.TipoUsuarioID),
          Tela: nested ? mapTela(nested) : undefined,
        }
      })
    },
  })

export const useCriarGestaoTipo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nome: string; descricao: string; papel: string }) =>
      apiClient.criarGestaoTipoUsuario(data),
    onSuccess: () => {
      toast.success("Perfil criado")
      qc.invalidateQueries({ queryKey: ["clinica-gestao-tipos"] })
      qc.invalidateQueries({ queryKey: ["clinica-tipos-usuario"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao criar perfil")
    },
  })
}

export const useAtualizarGestaoTipo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { id: number; nome?: string; descricao?: string; papel?: string }) =>
      apiClient.atualizarGestaoTipoUsuario(p.id, {
        nome: p.nome,
        descricao: p.descricao,
        papel: p.papel,
      }),
    onSuccess: () => {
      toast.success("Perfil atualizado")
      qc.invalidateQueries({ queryKey: ["clinica-gestao-tipos"] })
      qc.invalidateQueries({ queryKey: ["clinica-tipos-usuario"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao atualizar perfil")
    },
  })
}

export const useDesativarGestaoTipo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.desativarGestaoTipoUsuario(id),
    onSuccess: () => {
      toast.success("Perfil desativado")
      qc.invalidateQueries({ queryKey: ["clinica-gestao-tipos"] })
      qc.invalidateQueries({ queryKey: ["clinica-tipos-usuario"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao desativar")
    },
  })
}

export const useReativarGestaoTipo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.reativarGestaoTipoUsuario(id),
    onSuccess: () => {
      toast.success("Perfil reativado")
      qc.invalidateQueries({ queryKey: ["clinica-gestao-tipos"] })
      qc.invalidateQueries({ queryKey: ["clinica-tipos-usuario"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao reativar")
    },
  })
}

export const useToggleGestaoPermissao = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { tipoUsuarioId: number; telaId: number; grant: boolean }) => {
      if (p.grant) {
        await apiClient.associarGestaoPermissaoTela(p.tipoUsuarioId, p.telaId)
      } else {
        await apiClient.desassociarGestaoPermissaoTela(p.tipoUsuarioId, p.telaId)
      }
    },
    onSuccess: (_, p) => {
      qc.invalidateQueries({ queryKey: ["clinica-gestao-permissoes", p.tipoUsuarioId] })
      qc.invalidateQueries({ queryKey: ["minhas-permissoes-rotas"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao alterar permissão")
    },
  })
}
