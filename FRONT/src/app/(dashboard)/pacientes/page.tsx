"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PacienteResponse, PacienteRequest } from "@/types/api"
import { usePacientes, useCriarPaciente } from "@/hooks/use-pacientes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { Search, Users, FileText, Plus, CalendarPlus } from "lucide-react"

const emptyForm: PacienteRequest = {
  nome: "",
  cpf: "",
  data_nascimento: "",
  telefone: "",
  email: "",
  endereco: "",
}

export default function PacientesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [openCadastro, setOpenCadastro] = useState(false)
  const [form, setForm] = useState<PacienteRequest>(emptyForm)

  const { data: pacientes, isLoading } = usePacientes()
  const criarPaciente = useCriarPaciente()

  const filteredPacientes = pacientes?.filter((p: PacienteResponse) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cpf?.includes(searchTerm)
  ) ?? []

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || !form.cpf.trim()) return
    criarPaciente.mutate(form, {
      onSuccess: () => {
        setOpenCadastro(false)
        setForm(emptyForm)
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-600">Gerencie os pacientes da clínica</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <Button onClick={() => setOpenCadastro(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
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
                  {isLoading ? "..." : pacientes?.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
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
                {searchTerm ? "Tente ajustar a busca." : "Clique em \"Novo Paciente\" para cadastrar."}
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
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-blue-700">
                        {paciente.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{paciente.nome}</p>
                      <p className="text-sm text-slate-500">
                        CPF: {paciente.cpf}
                        {paciente.telefone && ` · ${paciente.telefone}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/agenda?paciente_id=${paciente.id}&paciente_nome=${encodeURIComponent(paciente.nome)}`)}
                      className="gap-2"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Agendar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/pacientes/${paciente.id}/prontuario`)}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Prontuário
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Cadastro */}
      <Dialog open={openCadastro} onOpenChange={setOpenCadastro}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Novo Paciente</DialogTitle>
          <DialogDescription>Preencha os dados para cadastrar um novo paciente.</DialogDescription>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="nome">Nome completo *</Label>
                <Input id="nome" name="nome" value={form.nome} onChange={handleField} placeholder="João da Silva" required />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cpf">CPF *</Label>
                <Input id="cpf" name="cpf" value={form.cpf} onChange={handleField} placeholder="000.000.000-00" required />
              </div>

              <div className="space-y-1">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input id="data_nascimento" name="data_nascimento" type="date" value={form.data_nascimento} onChange={handleField} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" value={form.telefone} onChange={handleField} placeholder="(11) 99999-9999" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleField} placeholder="joao@email.com" />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" name="endereco" value={form.endereco} onChange={handleField} placeholder="Rua, número, bairro" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpenCadastro(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criarPaciente.isPending} className="gap-2">
                <Plus className="h-4 w-4" />
                {criarPaciente.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
