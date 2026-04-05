import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type { AgendaRequest, AgendaResponse, UsuarioResponse, PacienteResponse, ProcedimentoResponse } from "@/types/api"
import { toast } from "sonner"

export const useAgendaDia = (data: string, profissionalId?: string) => {
  return useQuery<AgendaResponse[]>({
    queryKey: ["agenda-dia", data, profissionalId],
    queryFn: async (): Promise<AgendaResponse[]> => {
      const result = await apiClient.getAgendamentosDia(data, profissionalId)
      return result
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
      return (Array.isArray(response) ? response : response.pacientes ?? []) as PacienteResponse[]
    },
  })
}

export const useProfissionais = () => {
  return useQuery<UsuarioResponse[]>({
    queryKey: ["profissionais"],
    queryFn: async (): Promise<UsuarioResponse[]> => {
      const response = await apiClient.getUsuarios()
      const usuarios = Array.isArray(response) ? response : (response.usuarios ?? []) as UsuarioResponse[]
      return usuarios.filter((usuario) => usuario.tipo_usuario === "MEDICO")
    },
  })
}

export const useProcedimentos = () => {
  return useQuery<ProcedimentoResponse[]>({
    queryKey: ["procedimentos"],
    queryFn: async (): Promise<ProcedimentoResponse[]> => {
      const response = await apiClient.getProcedimentos()
      return (Array.isArray(response) ? response : response.procedimentos ?? []) as ProcedimentoResponse[]
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
