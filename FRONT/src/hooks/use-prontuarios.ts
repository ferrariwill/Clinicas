import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type { ProntuarioRegistroSwagger, CriarProntuarioRequest, AtualizarProntuarioRequest } from "@/types/api"
import { toast } from "sonner"

export const useProntuariosPaciente = (pacienteId: string) => {
  return useQuery<ProntuarioRegistroSwagger[]>(
    ["prontuarios-paciente", pacienteId],
    async () => {
      const response = await apiClient.getProntuarios()
      // Filter by patient ID - assuming the API returns all and we filter client-side
      // In a real implementation, this should be done server-side
      const prontuarios = Array.isArray(response) ? response : response.prontuarios ?? []
      return prontuarios.filter((p: ProntuarioRegistroSwagger) => p.paciente_id === pacienteId)
    },
    {
      enabled: Boolean(pacienteId),
      staleTime: 60 * 1000,
    }
  )
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
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao criar prontuário")
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
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao atualizar prontuário")
    },
  })
}