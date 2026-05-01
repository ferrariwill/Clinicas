import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { differenceInHours, isValid, parseISO } from "date-fns"
import { apiClient } from "@/services/api-client"
import type { ProntuarioRegistroSwagger, CriarProntuarioRequest, AtualizarProntuarioRequest } from "@/types/api"
import { toast } from "sonner"

function mapProntuarioRegistroFromAPI(raw: Record<string, unknown>): ProntuarioRegistroSwagger {
  const id = raw.id ?? raw.ID
  const conteudo = raw.conteudo ?? raw.Conteudo ?? raw.descricao
  const criado =
    (typeof raw.criado_em === "string" && raw.criado_em) ||
    (typeof raw.created_at === "string" && raw.created_at) ||
    (typeof raw.CreatedAt === "string" && raw.CreatedAt) ||
    ""
  const atualizado =
    (typeof raw.atualizado_em === "string" && raw.atualizado_em) ||
    (typeof raw.updated_at === "string" && raw.updated_at) ||
    (typeof raw.UpdatedAt === "string" && raw.UpdatedAt) ||
    criado
  let editavel = false
  if (criado) {
    try {
      const d = parseISO(criado)
      if (isValid(d)) editavel = differenceInHours(new Date(), d) <= 24
    } catch {
      editavel = false
    }
  }
  const prof = (raw.profissional ?? raw.Profissional) as Record<string, unknown> | undefined
  const nomeProf = prof ? (prof.nome ?? prof.Nome) : undefined
  const profissional_nome = typeof nomeProf === "string" && nomeProf.trim() ? nomeProf.trim() : undefined

  return {
    id: String(id ?? ""),
    paciente_id: String(raw.paciente_id ?? raw.PacienteID ?? ""),
    titulo: String(raw.titulo ?? raw.Titulo ?? ""),
    descricao: typeof conteudo === "string" ? conteudo : "",
    usuario_id: String(raw.profissional_id ?? raw.ProfissionalID ?? raw.usuario_id ?? raw.UsuarioID ?? ""),
    profissional_nome,
    criado_em: criado,
    atualizado_em: atualizado,
    editavel,
  }
}

export const useProntuariosPaciente = (pacienteId: string) => {
  return useQuery<ProntuarioRegistroSwagger[]>({
    queryKey: ["prontuarios-paciente", pacienteId],
    queryFn: async () => {
      const response = await apiClient.getProntuarios(pacienteId)
      const list = (Array.isArray(response) ? response : (response as { prontuarios?: unknown[] }).prontuarios ?? []) as Record<
        string,
        unknown
      >[]
      return list.map(mapProntuarioRegistroFromAPI)
    },
    enabled: Boolean(pacienteId),
    staleTime: 60 * 1000,
  })
}

export const useCriarProntuario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CriarProntuarioRequest) => {
      return await apiClient.criarProntuario(payload)
    },
    onSuccess: () => {
      toast.success("Prontuário criado com sucesso")
      queryClient.invalidateQueries({ queryKey: ["prontuarios-paciente"] })
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err?.message || "Erro ao criar prontuário")
    },
  })
}

export const useAtualizarProntuario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ prontuarioId, payload }: { prontuarioId: string; payload: AtualizarProntuarioRequest }) => {
      return await apiClient.atualizarProntuario(prontuarioId, payload)
    },
    onSuccess: () => {
      toast.success("Prontuário atualizado com sucesso")
      queryClient.invalidateQueries({ queryKey: ["prontuarios-paciente"] })
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err?.message || "Erro ao atualizar prontuário")
    },
  })
}