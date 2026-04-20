import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { PacienteResponse, PacienteRequest } from "@/types/api"
import { mapPacienteFromAPI } from "@/hooks/use-agenda"
import { toast } from "sonner"

export const usePacientes = () => {
  return useQuery<PacienteResponse[]>({
    queryKey: ["pacientes"],
    queryFn: async () => {
      const response = await apiClient.getPacientes()
      const rawList = (Array.isArray(response) ? response : response.pacientes ?? []) as Record<string, unknown>[]
      return rawList.map(mapPacienteFromAPI)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useCriarPaciente = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: PacienteRequest) => apiClient.criarPaciente(data),
    onSuccess: () => {
      toast.success("Paciente cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["pacientes"] })
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err.message || "Erro ao cadastrar paciente")
    },
  })
}

export const useAtualizarPaciente = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: PacienteRequest
    }) =>
      apiClient.atualizarPaciente(id, {
        nome: data.nome,
        cpf: data.cpf,
        data_nascimento: data.data_nascimento,
        telefone: data.telefone,
        email: data.email,
      }),
    onSuccess: () => {
      toast.success("Paciente atualizado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["pacientes"] })
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err.message || "Erro ao atualizar paciente")
    },
  })
}