import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type { AtestadoMedicoResponse, CriarAtestadoRequest } from "@/types/api"
import { toast } from "sonner"

function mapAtestadoFromAPI(raw: Record<string, unknown>): AtestadoMedicoResponse {
  const prof = raw.profissional ?? raw.Profissional
  const p = typeof prof === "object" && prof !== null ? (prof as Record<string, unknown>) : undefined
  const tipoRaw = String(raw.tipo ?? raw.Tipo ?? "").toUpperCase()
  const tipo: "HORAS" | "DIAS" = tipoRaw === "HORAS" ? "HORAS" : "DIAS"
  const q = Number(raw.quantidade ?? raw.Quantidade ?? 0)
  return {
    id: String(raw.id ?? raw.ID ?? ""),
    paciente_id: String(raw.paciente_id ?? raw.PacienteID ?? ""),
    profissional_id: raw.profissional_id != null ? String(raw.profissional_id) : raw.ProfissionalID != null ? String(raw.ProfissionalID) : undefined,
    tipo,
    quantidade: Number.isFinite(q) ? q : 0,
    cid10: String(raw.cid10 ?? raw.CID10 ?? ""),
    texto_gerado: String(raw.texto_gerado ?? raw.TextoGerado ?? ""),
    criado_em: String(raw.criado_em ?? raw.created_at ?? raw.CreatedAt ?? raw.createdAt ?? ""),
    profissional: p
      ? {
          nome: typeof p.nome === "string" ? p.nome : typeof p.Nome === "string" ? (p.Nome as string) : undefined,
          especialidade:
            typeof p.especialidade === "string"
              ? p.especialidade
              : typeof p.Especialidade === "string"
                ? (p.Especialidade as string)
                : undefined,
        }
      : undefined,
  }
}

export function atestadosPacienteQueryKey(pacienteId: string) {
  return ["atestados-paciente", pacienteId] as const
}

export const useAtestadosPaciente = (pacienteId: string) => {
  return useQuery<AtestadoMedicoResponse[]>({
    queryKey: atestadosPacienteQueryKey(pacienteId),
    queryFn: async () => {
      const response = await apiClient.getAtestados(pacienteId)
      const list = (Array.isArray(response) ? response : []) as Record<string, unknown>[]
      return list.map(mapAtestadoFromAPI)
    },
    enabled: Boolean(pacienteId),
    staleTime: 30 * 1000,
  })
}

export const useCriarAtestado = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CriarAtestadoRequest) => apiClient.criarAtestado(data),
    onSuccess: (_data, variables) => {
      toast.success("Atestado salvo com sucesso")
      void queryClient.invalidateQueries({ queryKey: atestadosPacienteQueryKey(variables.paciente_id) })
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(err?.message || "Erro ao salvar atestado")
    },
  })
}
