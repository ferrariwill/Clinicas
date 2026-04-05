import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type { AgendaRequest, AgendaResponse, UsuarioResponse, PacienteResponse, ProcedimentoResponse } from "@/types/api"
import { toast } from "sonner"

export const useAgendaDia = (data: string, profissionalId?: string) => {
  return useQuery<AgendaResponse[]>(
    ["agenda-dia", data, profissionalId],
    async () => {
      const result = await apiClient.getAgendamentosDia(data, profissionalId)
      return result
    },
    {
      enabled: Boolean(data),
      staleTime: 60 * 1000,
      retry: 1,
    }
  )
}

export const usePacientes = () => {
  return useQuery<PacienteResponse[]>(["pacientes"], async () => {
    const response = await apiClient.getPacientes()
    return Array.isArray(response) ? response : response.pacientes ?? []
  })
}

export const useProfissionais = () => {
  return useQuery<UsuarioResponse[]>(["profissionais"], async () => {
    const response = await apiClient.getUsuarios()
    const usuarios = Array.isArray(response) ? response : response.usuarios ?? []
    return usuarios.filter((usuario: UsuarioResponse) => usuario.tipo_usuario === "MEDICO")
  })
}

export const useProcedimentos = () => {
  return useQuery<ProcedimentoResponse[]>(["procedimentos"], async () => {
    const response = await apiClient.getProcedimentos()
    return Array.isArray(response) ? response : response.procedimentos ?? []
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

export const useAtualizarStatusAgenda = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agendaId, statusId }: { agendaId: string; statusId: string }) => {
      return await apiClient.atualizarStatusAgenda(agendaId, statusId)
    },
    onSuccess: () => {
      toast.success("Falta registrada. O índice de No-Show foi atualizado.")
      queryClient.invalidateQueries({ queryKey: ["agenda-dia"] })
    },
  })
}
