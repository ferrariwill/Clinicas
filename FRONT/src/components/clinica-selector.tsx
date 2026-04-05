"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { Building2 } from "lucide-react"
import { toast } from "sonner"

interface ClinicaSelectorProps {
  onClinicaChange?: (clinicaId: string) => void
}

export const ClinicaSelector: React.FC<ClinicaSelectorProps> = ({
  onClinicaChange,
}) => {
  const { userRole, clinicaId, changeClinica } = useAuth()
  const [clinicas, setClinicas] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Only show for ADM_GERAL
  if (userRole !== "ADM_GERAL") {
    return null
  }

  useEffect(() => {
    const loadClinicas = async () => {
      setIsLoading(true)
      try {
        const data = await apiClient.getClinicas()
        setClinicas(Array.isArray(data) ? data : data.clinicas || [])
      } catch (error) {
        toast.error("Erro ao carregar clínicas")
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen && clinicas.length === 0) {
      loadClinicas()
    }
  }, [isOpen, clinicas.length])

  const selectedClinica = clinicas.find((c) => c.id === clinicaId)

  const handleSelectClinica = (novaClinicaId: string) => {
    changeClinica(novaClinicaId)
    onClinicaChange?.(novaClinicaId)
    setIsOpen(false)
    toast.success("Clínica alterada com sucesso")
  }

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
        disabled={isLoading}
      >
        <Building2 className="w-4 h-4" />
        <span className="hidden sm:inline">
          {selectedClinica?.nome || "Selecionar Clínica"}
        </span>
        <span className="sm:hidden">{selectedClinica?.nome?.split(' ')[0]}</span>
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
              clinicas.map((clinica) => (
                <button
                  key={clinica.id}
                  onClick={() => handleSelectClinica(clinica.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                    clinica.id === clinicaId ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="font-medium text-gray-900">{clinica.nome}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {clinica.email}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
