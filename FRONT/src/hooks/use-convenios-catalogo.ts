import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/services/api-client"
import type { ConvenioRequest, ConvenioResponse } from "@/types/api"
import { toast } from "sonner"

function mapConvenioFromAPI(raw: Record<string, unknown>): ConvenioResponse {
  const id = raw.id ?? raw.ID
  const cid = raw.clinica_id ?? raw.ClinicaID
  const criado =
    typeof raw.criado_em === "string"
      ? raw.criado_em
      : typeof raw.CreatedAt === "string"
        ? raw.CreatedAt
        : undefined
  return {
    id: String(id ?? ""),
    nome: typeof (raw.nome ?? raw.Nome) === "string" ? String(raw.nome ?? raw.Nome) : "",
    ativo: Boolean(raw.ativo ?? raw.Ativo ?? true),
    ...(cid != null && cid !== "" ? { clinica_id: String(cid) } : {}),
    ...(criado ? { criado_em: criado } : {}),
  }
}

export const useConveniosCatalogo = () => {
  return useQuery<ConvenioResponse[]>({
    queryKey: ["convenios-catalogo"],
    queryFn: async () => {
      const response = await apiClient.getConvenios()
      const rawList = (Array.isArray(response) ? response : []) as Record<string, unknown>[]
      return rawList.map(mapConvenioFromAPI)
    },
  })
}

export const useCriarConvenioCatalogo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ConvenioRequest) => apiClient.criarConvenio(data),
    onSuccess: () => {
      toast.success("Convênio cadastrado")
      qc.invalidateQueries({ queryKey: ["convenios-catalogo"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao cadastrar convênio")
    },
  })
}

export const useAtualizarConvenioCatalogo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; data: ConvenioRequest }) =>
      apiClient.atualizarConvenio(vars.id, vars.data),
    onSuccess: () => {
      toast.success("Convênio atualizado")
      qc.invalidateQueries({ queryKey: ["convenios-catalogo"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao atualizar convênio")
    },
  })
}

export const useDesativarConvenioCatalogo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.desativarConvenio(id),
    onSuccess: () => {
      toast.success("Convênio desativado")
      qc.invalidateQueries({ queryKey: ["convenios-catalogo"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao desativar")
    },
  })
}

export const useReativarConvenioCatalogo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.reativarConvenio(id),
    onSuccess: () => {
      toast.success("Convênio reativado")
      qc.invalidateQueries({ queryKey: ["convenios-catalogo"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string }
      toast.error(err.message || "Erro ao reativar")
    },
  })
}
