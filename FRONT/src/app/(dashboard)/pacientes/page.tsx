"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PacienteResponse } from "@/types/api"
import { usePacientes } from "@/hooks/use-pacientes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { Search, Users, FileText } from "lucide-react"

export default function PacientesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  const { data: pacientes, isLoading } = usePacientes()

  const filteredPacientes = pacientes?.filter((paciente: PacienteResponse) =>
    paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paciente.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
          <p className="mt-2 text-sm text-slate-600">
            Gerencie os pacientes da clínica e acesse seus prontuários
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-100 bg-blue-50/80">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Pacientes</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {isLoading ? "..." : pacientes?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          )}

          {!isLoading && filteredPacientes.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">Nenhum paciente encontrado</p>
              <p className="text-sm mt-1">
                {searchTerm ? "Tente ajustar os filtros de busca." : "Não há pacientes cadastrados."}
              </p>
            </div>
          )}

          {!isLoading && filteredPacientes.length > 0 && (
            <div className="space-y-3">
              {filteredPacientes.map((paciente: PacienteResponse) => (
                <div
                  key={paciente.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {paciente.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{paciente.nome}</p>
                      <p className="text-sm text-slate-500">ID: {paciente.id}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/pacientes/${paciente.id}/prontuario`)}
                    className="inline-flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Ver Prontuário
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}