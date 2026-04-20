"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/services/api-client"
import type { MinhaClinicaAuth } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Building2 } from "lucide-react"
import { toast } from "sonner"

interface ClinicaSelectorProps {
  onClinicaChange?: (clinicaId: string) => void
}

export const ClinicaSelector: React.FC<ClinicaSelectorProps> = ({
  onClinicaChange,
}) => {
  const { userRole, clinicaId, trocarClinicaAtiva, isAuthenticated } = useAuth()
  const [clinicas, setClinicas] = useState<MinhaClinicaAuth[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSwitcher, setShowSwitcher] = useState(false)

  const loadClinicas = useCallback(async () => {
    setIsLoading(true)
    try {
      const { clinicas: list } = await apiClient.getMinhasClinicas()
      setClinicas(list)
      setShowSwitcher(userRole === "ADM_GERAL" || list.length > 1)
    } catch {
      toast.error("Erro ao carregar clínicas")
      setClinicas([])
      setShowSwitcher(false)
    } finally {
      setIsLoading(false)
    }
  }, [userRole])

  useEffect(() => {
    if (!isAuthenticated) {
      setClinicas([])
      setShowSwitcher(false)
      return
    }
    void loadClinicas()
  }, [isAuthenticated, loadClinicas])

  const toggleOpen = () => {
    const next = !isOpen
    setIsOpen(next)
    if (next && clinicas.length === 0) {
      void loadClinicas()
    }
  }

  if (!showSwitcher) {
    return null
  }

  const selectedClinica = clinicas.find(
    (c) => String(c.clinica_id) === clinicaId
  )

  const handleSelectClinica = async (novaClinicaId: string) => {
    const res = await trocarClinicaAtiva(novaClinicaId)
    if (res.success) {
      onClinicaChange?.(novaClinicaId)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        onClick={toggleOpen}
        className="flex items-center gap-2"
        disabled={isLoading}
      >
        <Building2 className="w-4 h-4" />
        <span className="hidden sm:inline">
          {selectedClinica?.nome || "Selecionar clínica"}
        </span>
        <span className="sm:hidden">
          {selectedClinica?.nome?.split(" ")[0] ?? "Clínica"}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Carregando clínicas...
              </div>
            ) : clinicas.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nenhuma clínica encontrada
              </div>
            ) : (
              clinicas.map((clinica) => {
                const idStr = String(clinica.clinica_id)
                return (
                  <button
                    key={idStr}
                    type="button"
                    onClick={() => handleSelectClinica(idStr)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                      idStr === clinicaId ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="font-medium text-gray-900">{clinica.nome}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {clinica.email || `ID ${idStr}`}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
