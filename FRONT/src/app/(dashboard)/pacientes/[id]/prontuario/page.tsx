"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO, differenceInHours } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ProntuarioRegistroSwagger } from "@/types/api"
import { useAuth } from "@/hooks/use-auth"
import { useProntuariosPaciente, useCriarProntuario, useAtualizarProntuario } from "@/hooks/use-prontuarios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Plus, Lock, Edit, Save, X, ClipboardList, Printer } from "lucide-react"
import { toast } from "sonner"
import { abrirImpressaoReceituario, isTituloReceituario } from "@/lib/utils/receituario-print"

const isEditable = (createdAt: string): boolean => {
  const created = parseISO(createdAt)
  const now = new Date()
  return differenceInHours(now, created) <= 24
}

type LinhaReceita = { medicamento: string; quantidade: string; intervalo: string }

function linhaReceitaVazia(): LinhaReceita {
  return { medicamento: "", quantidade: "", intervalo: "" }
}

function montarTextoReceituario(linhas: LinhaReceita[]): string {
  const partes: string[] = ["RECEITUÁRIO", "=================="]
  let n = 0
  for (const l of linhas) {
    const med = l.medicamento.trim()
    const q = l.quantidade.trim()
    const intv = l.intervalo.trim()
    if (!med && !q && !intv) continue
    n += 1
    partes.push(
      `ITEM ${n}`,
      `MEDICAMENTO: ${med.toUpperCase()}`,
      `QUANTIDADE: ${q.toUpperCase()}`,
      `INTERVALO ENTRE DOSES: ${intv.toUpperCase()}`,
      "------------------"
    )
  }
  return partes.join("\n").trim()
}

export default function ProntuarioPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission, usuario, clinicaId } = useAuth()
  const pacienteId = params.id as string

  const [openDialog, setOpenDialog] = useState(false)
  const [openReceita, setOpenReceita] = useState(false)
  const [receitaLinhas, setReceitaLinhas] = useState<LinhaReceita[]>(() => [linhaReceitaVazia()])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [newEntry, setNewEntry] = useState({
    titulo: "",
    descricao: "",
  })

  const { data: prontuarios, isLoading } = useProntuariosPaciente(pacienteId) as { data: ProntuarioRegistroSwagger[] | undefined; isLoading: boolean }
  const criarProntuario = useCriarProntuario()
  const atualizarProntuario = useAtualizarProntuario()

  const canCreateProntuario = hasPermission(["MEDICO", "DONO", "DONO_CLINICA", "SECRETARIA"])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!newEntry.titulo.trim()) {
      toast.error("TÍTULO É OBRIGATÓRIO")
      return
    }

    criarProntuario.mutate(
      {
        paciente_id: pacienteId,
        titulo: newEntry.titulo.trim().toUpperCase(),
        descricao: (newEntry.descricao || "").trim().toUpperCase(),
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

    const first = (editContent.split("\n")[0] || "EVOLUÇÃO CLÍNICA").trim().toUpperCase()
    atualizarProntuario.mutate({
      prontuarioId: editingId,
      payload: {
        titulo: first,
        descricao: editContent.trim().toUpperCase(),
      },
    })

    setEditingId(null)
    setEditContent("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent("")
  }

  const handleSalvarReceituario = (e: React.FormEvent) => {
    e.preventDefault()
    const texto = montarTextoReceituario(receitaLinhas)
    const temMedicamento = receitaLinhas.some((l) => l.medicamento.trim().length > 0)
    if (!temMedicamento) {
      toast.error("INFORME AO MENOS UM MEDICAMENTO.")
      return
    }
    criarProntuario.mutate(
      {
        paciente_id: pacienteId,
        titulo: "RECEITUÁRIO",
        descricao: texto,
      },
      {
        onSuccess: () => {
          setOpenReceita(false)
          setReceitaLinhas([linhaReceitaVazia()])
        },
      }
    )
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Prontuário do Paciente</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Histórico clínico e evoluções médicas
            </p>
          </div>
        </div>

        {canCreateProntuario && (
          <div className="flex flex-wrap gap-2">
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button variant="default" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova evolução
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

                {hasPermission(["MEDICO", "DONO", "DONO_CLINICA"]) && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                    <p className="text-xs font-medium text-emerald-900">Atalho</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full border-emerald-200 text-emerald-900 hover:bg-emerald-50 sm:w-auto"
                      onClick={() => setOpenReceita(true)}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Receituário rápido
                    </Button>
                  </div>
                )}

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

          <Dialog
            open={openReceita}
            onOpenChange={(o) => {
              setOpenReceita(o)
              if (o) setReceitaLinhas([linhaReceitaVazia()])
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="inline-flex items-center gap-2 border-emerald-200 text-emerald-900 hover:bg-emerald-50">
                <ClipboardList className="h-4 w-4" />
                Receituário
              </Button>
            </DialogTrigger>
            <DialogContent stackZ="z-[100]" className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogTitle className="uppercase tracking-wide">Receituário</DialogTitle>
              <DialogDescription className="uppercase text-xs tracking-wide text-slate-600">
                MEDICAMENTO, QUANTIDADE E INTERVALO ENTRE DOSES. O TEXTO SERÁ GRAVADO EM MAIÚSCULAS.
              </DialogDescription>
              <form onSubmit={handleSalvarReceituario} className="mt-4 space-y-4">
                {receitaLinhas.map((linha, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Item {idx + 1}</p>
                    <div className="space-y-1">
                      <Label className="uppercase text-xs">Medicamento</Label>
                      <Input
                        value={linha.medicamento}
                        onChange={(e) => {
                          const v = e.target.value
                          setReceitaLinhas((prev) => {
                            const copy = [...prev]
                            copy[idx] = { ...copy[idx], medicamento: v }
                            return copy
                          })
                        }}
                        placeholder="Ex.: Paracetamol 500 mg"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="uppercase text-xs">Quantidade</Label>
                        <Input
                          value={linha.quantidade}
                          onChange={(e) => {
                            const v = e.target.value
                            setReceitaLinhas((prev) => {
                              const copy = [...prev]
                              copy[idx] = { ...copy[idx], quantidade: v }
                              return copy
                            })
                          }}
                          placeholder="Ex.: 20 comprimidos"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="uppercase text-xs">Intervalo entre doses</Label>
                        <Input
                          value={linha.intervalo}
                          onChange={(e) => {
                            const v = e.target.value
                            setReceitaLinhas((prev) => {
                              const copy = [...prev]
                              copy[idx] = { ...copy[idx], intervalo: v }
                              return copy
                            })
                          }}
                          placeholder="Ex.: A cada 8 horas"
                        />
                      </div>
                    </div>
                    {receitaLinhas.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-700 uppercase text-xs"
                        onClick={() => setReceitaLinhas((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remover item
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  className="uppercase text-xs tracking-wide"
                  onClick={() => setReceitaLinhas((prev) => [...prev, linhaReceitaVazia()])}
                >
                  + Adicionar medicamento
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpenReceita(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={criarProntuario.isPending} className="uppercase tracking-wide">
                    Salvar receituário
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
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
                <Card key={prontuario.id} className="border-slate-200 dark:border-slate-600">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-slate-900 dark:text-slate-50">
                          {prontuario.titulo}
                        </CardTitle>
                        <div className="mt-2 flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                          <span>
                            Registrado em:{" "}
                            {format(parseISO(prontuario.criado_em), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                          {prontuario.atualizado_em &&
                            prontuario.atualizado_em !== prontuario.criado_em &&
                            !Number.isNaN(parseISO(prontuario.atualizado_em).getTime()) && (
                              <span>
                                Última alteração:{" "}
                                {format(parseISO(prontuario.atualizado_em), "dd/MM/yyyy 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                            )}
                          <span className="text-slate-700 dark:text-slate-300">
                            Profissional:{" "}
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {prontuario.profissional_nome?.trim() ||
                                (prontuario.usuario_id ? `Usuário #${prontuario.usuario_id}` : "—")}
                            </span>
                          </span>
                          {!editable && (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                              <Lock className="h-3 w-3" />
                              Assinado digitalmente
                            </span>
                          )}
                        </div>
                      </div>

                      {editable && (
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              {hasPermission(["MEDICO", "DONO", "DONO_CLINICA"]) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  className="inline-flex items-center gap-1 border-emerald-200 text-emerald-900"
                                  onClick={() => setOpenReceita(true)}
                                  title="Abrir formulário de receituário"
                                >
                                  <ClipboardList className="h-3 w-3" />
                                  Receituário
                                </Button>
                              )}
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
                    {isTituloReceituario(prontuario.titulo) && !isEditing && (
                      <div className="mb-3 flex flex-wrap gap-2 print:hidden">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            const ok = abrirImpressaoReceituario({
                              conteudo: prontuario.descricao || "",
                              pacienteRef: `ID ${pacienteId}`,
                              profissionalNome: usuario?.nome,
                              clinicaNome: clinicaId ? `CLÍNICA #${clinicaId}` : undefined,
                              dataExibicao: format(parseISO(prontuario.criado_em), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              }),
                            })
                            if (!ok) toast.error("PERMITA POP-UPS PARA IMPRIMIR O RECEITUÁRIO.")
                          }}
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir / salvar PDF
                        </Button>
                      </div>
                    )}
                    <div className="max-w-none">
                      {isEditing ? (
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={8}
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="Digite a evolução clínica..."
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                          {prontuario.descricao || "Sem descrição"}
                        </div>
                      )}
                    </div>
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