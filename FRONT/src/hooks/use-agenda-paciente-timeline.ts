import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type { AgendaResponse } from "@/types/api"
import { mapAgendaFromAPI } from "@/hooks/use-agenda"

export function agendaPacienteTimelineQueryKey(pacienteId: string) {
  return ["agenda-paciente-passados", pacienteId] as const
}

export const useAgendamentosPassadosPaciente = (pacienteId: string, enabled: boolean) => {
  return useQuery<AgendaResponse[]>({
    queryKey: agendaPacienteTimelineQueryKey(pacienteId),
    queryFn: async () => {
      const result = await apiClient.getAgendamentosPassadosPaciente(pacienteId, 300)
      const rawList = (Array.isArray(result) ? result : []) as Record<string, unknown>[]
      return rawList.map(mapAgendaFromAPI)
    },
    enabled: Boolean(pacienteId && enabled),
    staleTime: 60 * 1000,
    retry: 1,
  })
}
