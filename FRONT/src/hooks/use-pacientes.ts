import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import { PacienteResponse } from "@/types/api"

export const usePacientes = () => {
  return useQuery<PacienteResponse[]>(
    ["pacientes"],
    async () => {
      const response = await apiClient.getPacientes()
      return Array.isArray(response) ? response : response.pacientes ?? []
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}