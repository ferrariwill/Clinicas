"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO, differenceInHours } from "date-fns"
import { ProntuarioRegistroSwagger } from "@/types/api"
import { useAuth } from "@/hooks/use-auth"
import { useProntuariosPaciente, useCriarProntuario, useAtualizarProntuario } from "@/hooks/use-prontuarios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Plus, Lock, Edit, Save, X } from "lucide-react"
import { toast } from "sonner"

const isEditable = (createdAt: string): boolean => {
  const created = parseISO(createdAt)
  const now = new Date()
  return differenceInHours(now, created) <= 24
}

export default function ProntuarioPage() {
  const params = useParams()
  const router = useRouter()
  const { usuario, hasPermission } = useAuth()
  const pacienteId = params.id as string

  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [newEntry, setNewEntry] = useState({
    titulo: "",
    descricao: "",
  })

  const { data: prontuarios, isLoading } = useProntuariosPaciente(pacienteId)
  const criarProntuario = useCriarProntuario()
  const atualizarProntuario = useAtualizarProntuario()

  const canCreateProntuario = hasPermission(["MEDICO", "DONO_CLINICA"])
  const isSecretaria = usuario?.tipo_usuario === "SECRETARIA"

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!newEntry.titulo.trim()) {
      toast.error("Título é obrigatório")
      return
    }

    criarProntuario.mutate(
      {
        paciente_id: pacienteId,
        titulo: newEntry.titulo,
        descricao: newEntry.descricao,
        usuario_id: usuario?.id || "",
      },
      {
        onSuccess: () => {
          setOpenDialog(false)
          setNewEntry({ titulo: "", descricao: "" })
        },
      }
    )
  }

  const handleEdit = (prontuarioId: string, currentContent: string) => {
    setEditingId(prontuarioId)
    setEditContent(currentContent)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return

    atualizarProntuario.mutate({
      prontuarioId: editingId,
      payload: {
        titulo: editContent.split('\n')[0] || "Evolução Clínica",
        descricao: editContent,
      },
    })

    setEditingId(null)
    setEditContent("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Prontuário do Paciente</h1>
            <p className="mt-2 text-sm text-slate-600">
              Histórico clínico e evoluções médicas
            </p>
          </div>
        </div>

        {canCreateProntuario && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button variant="default" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Evolução
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogTitle>Nova Evolução Clínica</DialogTitle>
              <DialogDescription>
                Registre uma nova evolução no prontuário do paciente.
              </DialogDescription>

              <form onSubmit={handleCreate} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Título da Evolução
                  </label>
                  <input
                    type="text"
                    value={newEntry.titulo}
                    onChange={(e) => setNewEntry({ ...newEntry, titulo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Ex: Consulta de Rotina, Exame Laboratorial, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descrição da Evolução
                  </label>
                  <textarea
                    value={newEntry.descricao}
                    onChange={(e) => setNewEntry({ ...newEntry, descricao: e.target.value })}
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Descreva os sintomas, diagnóstico, tratamento, observações..."
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={() => setOpenDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    Salvar Evolução
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        )}

        {!isLoading && (!prontuarios || prontuarios.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-slate-500">
                <p className="text-lg font-medium">Nenhum registro encontrado</p>
                <p className="text-sm mt-1">Este paciente ainda não possui evoluções clínicas registradas.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && prontuarios && prontuarios.length > 0 && (
          <div className="space-y-4">
            {prontuarios.map((prontuario: ProntuarioRegistroSwagger) => {
              const editable = isEditable(prontuario.criado_em)
              const isEditing = editingId === prontuario.id

              return (
                <Card key={prontuario.id} className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-slate-900">
                          {prontuario.titulo}
                        </CardTitle>
                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                          <span>Data: {format(parseISO(prontuario.criado_em), "dd/MM/yyyy 'às' HH:mm")}</span>
                          <span>Profissional: {prontuario.usuario_id}</span>
                          {!editable && (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <Lock className="h-3 w-3" />
                              Assinado digitalmente
                            </span>
                          )}
                        </div>
                      </div>

                      {editable && !isSecretaria && (
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                className="inline-flex items-center gap-1"
                              >
                                <Save className="h-3 w-3" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center gap-1"
                              >
                                <X className="h-3 w-3" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(prontuario.id, prontuario.descricao || "")}
                              className="inline-flex items-center gap-1"
                              title="Editar evolução"
                            >
                              <Edit className="h-3 w-3" />
                              Editar
                            </Button>
                          )}
                        </div>
                      )}

                      {!editable && (
                        <div
                          className="inline-flex items-center gap-1 text-slate-400"
                          title="Este prontuário foi assinado digitalmente e não pode mais ser alterado (Regra de 24h)"
                        >
                          <Lock className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {isSecretaria ? (
                      <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <Lock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">
                          Conteúdo protegido por privacidade (LGPD)
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Apenas profissionais médicos têm acesso ao conteúdo completo.
                        </p>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        {isEditing ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={8}
                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Digite a evolução clínica..."
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-slate-700">
                            {prontuario.descricao || "Sem descrição"}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}