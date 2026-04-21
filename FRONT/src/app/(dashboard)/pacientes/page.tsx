"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { startOfDay } from "date-fns"
import { PacienteResponse, PacienteRequest } from "@/types/api"
import { usePacientes, useCriarPaciente, useAtualizarPaciente } from "@/hooks/use-pacientes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { Search, Users, FileText, Plus, CalendarPlus, Pencil } from "lucide-react"
import {
  maskCPF,
  maskPhoneBR,
  maskDataBR,
  dataBRToISO,
  dataISOToBR,
  digitsOnly,
  maskCPFForDisplayLGPD,
  formatTelefoneDisplay,
} from "@/lib/utils/masks"
import { toast } from "sonner"

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
  const [openEditar, setOpenEditar] = useState(false)
  const [openAgendarData, setOpenAgendarData] = useState(false)
  const [pacienteParaAgendar, setPacienteParaAgendar] = useState<PacienteResponse | null>(null)
  const [dataAgendar, setDataAgendar] = useState<Date>(() => new Date())
  const [pacienteEditandoId, setPacienteEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<PacienteRequest>(emptyForm)

  const { data: pacientes, isLoading } = usePacientes()
  const criarPaciente = useCriarPaciente()
  const atualizarPaciente = useAtualizarPaciente()

  const searchLower = searchTerm.toLowerCase().trim()
  const searchCpfDigits = digitsOnly(searchTerm)
  const filteredPacientes =
    pacientes?.filter((p: PacienteResponse) => {
      if (!searchLower && searchCpfDigits.length === 0) return true
      if (searchLower && p.nome.toLowerCase().includes(searchLower)) return true
      if (searchCpfDigits.length > 0) {
        const cpfStored = digitsOnly(p.cpf || "")
        if (cpfStored.includes(searchCpfDigits)) return true
      }
      return false
    }) ?? []

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "cpf") {
      setForm((prev) => ({ ...prev, cpf: maskCPF(value) }))
      return
    }
    if (name === "telefone") {
      setForm((prev) => ({ ...prev, telefone: maskPhoneBR(value) }))
      return
    }
    if (name === "data_nascimento") {
      setForm((prev) => ({ ...prev, data_nascimento: maskDataBR(value) }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || !form.cpf.trim()) return
    const cpfDigits = digitsOnly(form.cpf)
    if (cpfDigits.length !== 11) {
      toast.error("CPF deve ter 11 dígitos")
      return
    }
    const dataISO = form.data_nascimento.trim()
      ? dataBRToISO(form.data_nascimento.trim())
      : ""
    if (form.data_nascimento.trim() && !dataISO) {
      toast.error("Data de nascimento inválida. Use dd/mm/aaaa")
      return
    }
    criarPaciente.mutate(
      {
        ...form,
        cpf: cpfDigits,
        telefone: form.telefone ? digitsOnly(form.telefone) : "",
        data_nascimento: dataISO || "",
      },
      {
        onSuccess: () => {
          setOpenCadastro(false)
          setForm(emptyForm)
        },
      }
    )
  }

  const abrirEdicao = (p: PacienteResponse) => {
    const dn = p.data_nascimento?.trim()
    const dnBR =
      dn && /^\d{4}-\d{2}-\d{2}/.test(dn) ? dataISOToBR(dn.slice(0, 10)) : dn ? maskDataBR(dn) : ""
    setPacienteEditandoId(p.id)
    setForm({
      nome: p.nome,
      cpf: maskCPF(digitsOnly(p.cpf)),
      data_nascimento: dnBR,
      telefone: p.telefone ? maskPhoneBR(p.telefone) : "",
      email: p.email ?? "",
      endereco: p.endereco ?? "",
    })
    setOpenEditar(true)
  }

  const handleSubmitEdicao = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pacienteEditandoId) return
    if (!form.nome.trim() || !form.cpf.trim()) return
    const cpfDigits = digitsOnly(form.cpf)
    if (cpfDigits.length !== 11) {
      toast.error("CPF deve ter 11 dígitos")
      return
    }
    const dataISO = form.data_nascimento.trim()
      ? dataBRToISO(form.data_nascimento.trim())
      : ""
    if (form.data_nascimento.trim() && !dataISO) {
      toast.error("Data de nascimento inválida. Use dd/mm/aaaa")
      return
    }
    atualizarPaciente.mutate(
      {
        id: pacienteEditandoId,
        data: {
          ...form,
          cpf: cpfDigits,
          telefone: form.telefone ? digitsOnly(form.telefone) : "",
          data_nascimento: dataISO || "",
        },
      },
      {
        onSuccess: () => {
          setOpenEditar(false)
          setPacienteEditandoId(null)
          setForm(emptyForm)
        },
      }
    )
  }

  const abrirAgendar = (p: PacienteResponse) => {
    setPacienteParaAgendar(p)
    setDataAgendar(new Date())
    setOpenAgendarData(true)
  }

  const confirmarIrAgenda = () => {
    if (!pacienteParaAgendar) return
    const dataStr = format(startOfDay(dataAgendar), "yyyy-MM-dd")
    router.push(
      `/agenda?data=${dataStr}&paciente_id=${pacienteParaAgendar.id}&paciente_nome=${encodeURIComponent(pacienteParaAgendar.nome)}`
    )
    setOpenAgendarData(false)
    setPacienteParaAgendar(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-600">Gerencie os pacientes da clínica</p>
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
                        CPF: {maskCPFForDisplayLGPD(paciente.cpf)}
                        {paciente.telefone ? ` · Tel. ${formatTelefoneDisplay(paciente.telefone)}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirAgendar(paciente)} className="gap-2">
                      <CalendarPlus className="h-4 w-4" />
                      Agendar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(paciente)} className="gap-2">
                      <Pencil className="h-4 w-4" />
                      Editar
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

      <Dialog
        open={openAgendarData}
        onOpenChange={(open) => {
          setOpenAgendarData(open)
          if (!open) setPacienteParaAgendar(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>Agendar consulta</DialogTitle>
          <DialogDescription>
            {pacienteParaAgendar
              ? `Escolha a data da consulta para ${pacienteParaAgendar.nome}. Só é permitido hoje ou datas futuras.`
              : ""}
          </DialogDescription>
          <div className="mt-4 flex justify-center">
            <Calendar selected={dataAgendar} onSelect={(d) => d && setDataAgendar(d)} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpenAgendarData(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmarIrAgenda} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              Ir para agenda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <Input
                  id="data_nascimento"
                  name="data_nascimento"
                  inputMode="numeric"
                  autoComplete="bday"
                  placeholder="dd/mm/aaaa"
                  value={form.data_nascimento}
                  onChange={handleField}
                />
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

      <Dialog
        open={openEditar}
        onOpenChange={(open) => {
          setOpenEditar(open)
          if (!open) {
            setPacienteEditandoId(null)
            setForm(emptyForm)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>Editar paciente</DialogTitle>
          <DialogDescription>Altere os dados e salve.</DialogDescription>

          <form onSubmit={handleSubmitEdicao} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="edit-nome">Nome completo *</Label>
                <Input id="edit-nome" name="nome" value={form.nome} onChange={handleField} required />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-cpf">CPF *</Label>
                <Input id="edit-cpf" name="cpf" value={form.cpf} onChange={handleField} required />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-data_nascimento">Data de Nascimento</Label>
                <Input
                  id="edit-data_nascimento"
                  name="data_nascimento"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={form.data_nascimento}
                  onChange={handleField}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input id="edit-telefone" name="telefone" value={form.telefone} onChange={handleField} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input id="edit-email" name="email" type="email" value={form.email} onChange={handleField} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpenEditar(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={atualizarPaciente.isPending}>
                {atualizarPaciente.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
