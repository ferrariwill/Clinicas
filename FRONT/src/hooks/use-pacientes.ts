import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { PacienteResponse, PacienteRequest } from "@/types/api"
import { toast } from "sonner"

export const usePacientes = () => {
  return useQuery<PacienteResponse[]>({
    queryKey: ["pacientes"],
    queryFn: async () => {
      const response = await apiClient.getPacientes()
      return Array.isArray(response) ? response : response.pacientes ?? []
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