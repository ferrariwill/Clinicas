"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO, differenceInHours, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ProntuarioRegistroSwagger } from "@/types/api"
import { useAuth } from "@/hooks/use-auth"
import { useProntuariosPaciente, useCriarProntuario, useAtualizarProntuario } from "@/hooks/use-prontuarios"
import { useAtestadosPaciente, useCriarAtestado } from "@/hooks/use-atestados"
import { useAgendamentosPassadosPaciente } from "@/hooks/use-agenda-paciente-timeline"
import { usePacientes } from "@/hooks/use-pacientes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  ModalActions,
  ModalButton,
  modalIconProps,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import {
  Activity,
  ArrowLeft,
  ClipboardList,
  Edit,
  FileSignature,
  FileText,
  FlaskConical,
  LayoutGrid,
  Lock,
  Plus,
  Printer,
  Save,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { abrirImpressaoReceituario, isTituloReceituario } from "@/lib/utils/receituario-print"
import { abrirImpressaoAtestado } from "@/lib/utils/atestado-print"
import { gerarTextoAtestadoBr, horarioConsultaValido24h, type TipoAfastamento } from "@/lib/atestado-brasil"
import { cid10ValidoParaUso, normalizarCid10 } from "@/lib/cid10/cid10-utils"
import { codigoExisteNaLista } from "@/lib/cid10/lista-cid10"
import { registrarCid10ManualRecente } from "@/lib/cid10/cid10-recentes"
import { BuscaCID10 } from "@/components/busca-cid10"
import { ProntuarioLinhaTempo } from "@/components/prontuario-linha-tempo"
import { Odontograma } from "@/components/odontograma"
import { MapaDeDor, type MapaDeDorValor } from "@/components/mapa-de-dor"
import {
  criarOdontogramaInicial,
  deserializarOdontograma,
  isTituloOdontograma,
  ODONTOGRAMA_TITULO,
  serializarOdontograma,
  type OdontogramaDentes,
} from "@/lib/odontograma-serial"
import {
  criarMapaDeDorInicial,
  deserializarMapaDeDor,
  isTituloMapaDeDor,
  MAPA_DE_DOR_TITULO,
  serializarMapaDeDor,
} from "@/lib/mapa-dor-serial"
import {
  parseConteudoEvolucao,
  removerFraseAutomaticaDoTexto,
  serializarEvolucaoComMapa,
  sincronizarDescricaoComMapa,
  temRegiaoDorAtiva,
} from "@/lib/prontuario-evolucao-mapa-dor"
import {
  ANAMNESE_TITULO,
  criarAnamneseInicial,
  deserializarAnamnese,
  isTituloAnamnese,
  modeloAnamnesePorEspecialidade,
  serializarAnamnese,
  type AnamneseDeserializada,
} from "@/lib/anamnese-templates"
import { AnamneseForm } from "@/components/anamnese-form"
import { SolicitacaoExamesDialog } from "@/components/solicitacao-exames-dialog"
import { PlanoTratamentoSection } from "@/components/plano-tratamento-section"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const isEditable = (createdAt: string): boolean => {
  const created = parseISO(createdAt)
  const now = new Date()
  return differenceInHours(now, created) <= 24
}

type LinhaReceita = { medicamento: string; quantidade: string; intervalo: string }

function linhaReceitaVazia(): LinhaReceita {
  return { medicamento: "", quantidade: "", intervalo: "" }
}

/** Ícones da barra do prontuário: mesma biblioteca, tamanho e traço. */
const ICO = { className: "size-4 shrink-0", strokeWidth: 1.75 } as const

/** Botões neutros da barra superior (ghost/outline unificado). */
const PRONTUARIO_TOOLBAR_OUTLINE =
  "inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-800/80"

/** Ação principal da barra (+ Nova evolução). */
const PRONTUARIO_TOOLBAR_PRIMARY =
  "inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:border-blue-700 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"

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
  const [openOdonto, setOpenOdonto] = useState(false)
  const [openMapaDor, setOpenMapaDor] = useState(false)
  const [openAnamnese, setOpenAnamnese] = useState(false)
  const [openAtestado, setOpenAtestado] = useState(false)
  const [atTipo, setAtTipo] = useState<TipoAfastamento>("DIAS")
  const [atQtd, setAtQtd] = useState("1")
  const [atCid, setAtCid] = useState("")
  /** Horário em que o paciente esteve em consulta (texto do atestado); formato 24h HH:MM. */
  const [atConsultaInicio, setAtConsultaInicio] = useState("")
  const [atConsultaFim, setAtConsultaFim] = useState("")
  const [mapaDraft, setMapaDraft] = useState<MapaDeDorValor>(() => criarMapaDeDorInicial())
  /** Mapa integrado ao diálogo “Nova evolução” (sincroniza o texto). */
  const [mapaEvolucao, setMapaEvolucao] = useState<MapaDeDorValor>(() => criarMapaDeDorInicial())
  const [anamneseDraft, setAnamneseDraft] = useState<Record<string, string>>(() =>
    criarAnamneseInicial(modeloAnamnesePorEspecialidade(undefined))
  )
  const [odontoDraft, setOdontoDraft] = useState<OdontogramaDentes>(() => criarOdontogramaInicial())
  const [openReceita, setOpenReceita] = useState(false)
  const [openExames, setOpenExames] = useState(false)
  const [receitaLinhas, setReceitaLinhas] = useState<LinhaReceita[]>(() => [linhaReceitaVazia()])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editOdonto, setEditOdonto] = useState<OdontogramaDentes | null>(null)
  const [editMapaDor, setEditMapaDor] = useState<MapaDeDorValor | null>(null)
  /** Evolução com mapa embutido no `conteudo` (não confundir com registro só MAPA_DE_DOR). */
  const [editEvolucaoMapa, setEditEvolucaoMapa] = useState<MapaDeDorValor | null>(null)
  const [editingTitulo, setEditingTitulo] = useState("")
  const [editAnamnese, setEditAnamnese] = useState<AnamneseDeserializada | null>(null)
  const [newEntry, setNewEntry] = useState({
    titulo: "",
    descricao: "",
  })

  const { data: prontuarios, isLoading } = useProntuariosPaciente(pacienteId) as { data: ProntuarioRegistroSwagger[] | undefined; isLoading: boolean }
  const { data: pacientesLista } = usePacientes()
  const paciente = useMemo(
    () => pacientesLista?.find((p) => String(p.id) === String(pacienteId)),
    [pacientesLista, pacienteId]
  )
  const { data: atestadosLista, isLoading: loadingAtestados } = useAtestadosPaciente(pacienteId)
  const { data: agendasPassados, isLoading: loadingLinhaTempo } = useAgendamentosPassadosPaciente(
    pacienteId,
    Boolean(pacienteId)
  )
  const criarAtestado = useCriarAtestado()
  const criarProntuario = useCriarProntuario()
  const atualizarProntuario = useAtualizarProntuario()

  const canCreateProntuario = hasPermission(["MEDICO", "DONO", "DONO_CLINICA", "SECRETARIA"])
  const podeFichaClinica = hasPermission(["MEDICO", "DONO", "DONO_CLINICA"])
  const esp = (usuario?.especialidade ?? "").trim().toUpperCase()
  const isDentista = esp === "DENTISTA"
  const modeloAnamnese = useMemo(
    () => modeloAnamnesePorEspecialidade(usuario?.especialidade),
    [usuario?.especialidade]
  )
  const podeEmitirAtestado = podeFichaClinica
  const mostrarSecaoAtestados = podeEmitirAtestado || (atestadosLista?.length ?? 0) > 0

  const textoPreviewAtestado = useMemo(() => {
    if (!paciente) return ""
    const q = Math.max(1, Math.min(999, Number.parseInt(atQtd, 10) || 1))
    const cidShow = cid10ValidoParaUso(atCid) ? normalizarCid10(atCid) : "(informe um CID-10 válido)"
    const hi = atConsultaInicio.trim()
    const hf = atConsultaFim.trim()
    const horasConsulta =
      hi && hf && horarioConsultaValido24h(hi) && horarioConsultaValido24h(hf)
        ? { consultaHoraInicio: hi, consultaHoraFim: hf }
        : {}
    return gerarTextoAtestadoBr({
      pacienteNome: paciente.nome,
      pacienteCPF: paciente.cpf,
      tipo: atTipo,
      quantidade: q,
      cid10: cidShow,
      profissionalNome: usuario?.nome ?? "",
      especialidadeProfissional: modeloAnamnese,
      ...horasConsulta,
    })
  }, [paciente, atTipo, atQtd, atCid, atConsultaInicio, atConsultaFim, usuario?.nome, modeloAnamnese])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!newEntry.titulo.trim()) {
      toast.error("TÍTULO É OBRIGATÓRIO")
      return
    }

    const podeMapaNaEvol = podeFichaClinica && !isDentista
    const textoSincronizado = podeMapaNaEvol
      ? sincronizarDescricaoComMapa(newEntry.descricao, mapaEvolucao)
      : (newEntry.descricao || "").trim()
    const usarEnvelope = podeMapaNaEvol && temRegiaoDorAtiva(mapaEvolucao)
    const conteudo = usarEnvelope
      ? serializarEvolucaoComMapa(textoSincronizado, mapaEvolucao)
      : textoSincronizado.toUpperCase()

    criarProntuario.mutate(
      {
        paciente_id: pacienteId,
        titulo: newEntry.titulo.trim().toUpperCase(),
        descricao: conteudo,
      },
      {
        onSuccess: () => {
          setOpenDialog(false)
          setNewEntry({ titulo: "", descricao: "" })
          setMapaEvolucao(criarMapaDeDorInicial())
        },
      }
    )
  }

  const handleEdit = (prontuarioId: string, currentContent: string, tituloRegistro: string) => {
    setEditingId(prontuarioId)
    setEditingTitulo(tituloRegistro.trim())
    setEditContent(currentContent)
    setEditOdonto(null)
    setEditMapaDor(null)
    setEditAnamnese(null)
    setEditEvolucaoMapa(null)
    if (isTituloOdontograma(tituloRegistro)) {
      setEditOdonto(deserializarOdontograma(currentContent) ?? criarOdontogramaInicial())
    } else if (isTituloMapaDeDor(tituloRegistro)) {
      setEditMapaDor(deserializarMapaDeDor(currentContent) ?? criarMapaDeDorInicial())
    } else if (isTituloAnamnese(tituloRegistro)) {
      const parsed = deserializarAnamnese(currentContent)
      setEditAnamnese(
        parsed ?? {
          especialidade: modeloAnamnese,
          respostas: criarAnamneseInicial(modeloAnamnese),
        }
      )
    } else {
      const parsed = parseConteudoEvolucao(currentContent)
      if (parsed.kind === "com_mapa") {
        setEditEvolucaoMapa(parsed.mapa)
        setEditContent(parsed.texto)
      }
    }
  }

  const handleSaveEdit = async () => {
    if (!editingId) return

    if (editOdonto) {
      atualizarProntuario.mutate({
        prontuarioId: editingId,
        payload: {
          titulo: ODONTOGRAMA_TITULO,
          conteudo: serializarOdontograma(editOdonto),
        },
      })
    } else if (editMapaDor) {
      atualizarProntuario.mutate({
        prontuarioId: editingId,
        payload: {
          titulo: MAPA_DE_DOR_TITULO,
          conteudo: serializarMapaDeDor(editMapaDor),
        },
      })
    } else if (editAnamnese) {
      atualizarProntuario.mutate({
        prontuarioId: editingId,
        payload: {
          titulo: ANAMNESE_TITULO,
          conteudo: serializarAnamnese(editAnamnese.especialidade, editAnamnese.respostas),
        },
      })
    } else if (editEvolucaoMapa) {
      if (temRegiaoDorAtiva(editEvolucaoMapa)) {
        const texto = sincronizarDescricaoComMapa(editContent, editEvolucaoMapa)
        atualizarProntuario.mutate({
          prontuarioId: editingId,
          payload: {
            titulo: (editingTitulo || "EVOLUÇÃO CLÍNICA").trim().toUpperCase(),
            conteudo: serializarEvolucaoComMapa(texto, editEvolucaoMapa),
          },
        })
      } else {
        atualizarProntuario.mutate({
          prontuarioId: editingId,
          payload: {
            titulo: (editingTitulo || "EVOLUÇÃO CLÍNICA").trim().toUpperCase(),
            descricao: removerFraseAutomaticaDoTexto(editContent).trim().toUpperCase(),
          },
        })
      }
    } else {
      const tituloSalvar = (editingTitulo || editContent.split("\n")[0] || "EVOLUÇÃO CLÍNICA").trim().toUpperCase()
      atualizarProntuario.mutate({
        prontuarioId: editingId,
        payload: {
          titulo: tituloSalvar,
          descricao: editContent.trim().toUpperCase(),
        },
      })
    }

    setEditingId(null)
    setEditContent("")
    setEditOdonto(null)
    setEditMapaDor(null)
    setEditAnamnese(null)
    setEditEvolucaoMapa(null)
    setEditingTitulo("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent("")
    setEditOdonto(null)
    setEditMapaDor(null)
    setEditAnamnese(null)
    setEditEvolucaoMapa(null)
    setEditingTitulo("")
  }

  const handleSalvarOdontograma = (e: React.FormEvent) => {
    e.preventDefault()
    criarProntuario.mutate(
      {
        paciente_id: pacienteId,
        titulo: ODONTOGRAMA_TITULO,
        conteudo: serializarOdontograma(odontoDraft),
      },
      {
        onSuccess: () => {
          setOpenOdonto(false)
          setOdontoDraft(criarOdontogramaInicial())
        },
      }
    )
  }

  const handleSalvarMapaDor = (e: React.FormEvent) => {
    e.preventDefault()
    criarProntuario.mutate(
      {
        paciente_id: pacienteId,
        titulo: MAPA_DE_DOR_TITULO,
        conteudo: serializarMapaDeDor(mapaDraft),
      },
      {
        onSuccess: () => {
          setOpenMapaDor(false)
          setMapaDraft(criarMapaDeDorInicial())
        },
      }
    )
  }

  const handleSalvarAnamnese = (e: React.FormEvent) => {
    e.preventDefault()
    criarProntuario.mutate(
      {
        paciente_id: pacienteId,
        titulo: ANAMNESE_TITULO,
        conteudo: serializarAnamnese(modeloAnamnese, anamneseDraft),
      },
      {
        onSuccess: () => {
          setOpenAnamnese(false)
          setAnamneseDraft(criarAnamneseInicial(modeloAnamnese))
        },
      }
    )
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

  const imprimirAtestadoComTexto = (texto: string) => {
    const ok = abrirImpressaoAtestado({
      textoCorpo: texto,
      clinicaNome: clinicaId ? `Clínica #${clinicaId}` : undefined,
    })
    if (!ok) {
      toast.error("Não foi possível abrir a impressão. Tente novamente ou verifique bloqueios do navegador.")
    }
  }

  const handleImprimirAtestadoPreview = () => {
    if (!cid10ValidoParaUso(atCid)) {
      toast.error("CID-10 é obrigatório e deve estar no formato válido (ex.: J06.9) para impressão.")
      return
    }
    if (!paciente) {
      toast.error("Carregue a lista de pacientes ou volte à lista e abra o prontuário novamente.")
      return
    }
    const hi = atConsultaInicio.trim()
    const hf = atConsultaFim.trim()
    if ((hi && !hf) || (!hi && hf)) {
      toast.error("Preencha horário de início e fim da consulta, ou deixe os dois em branco.")
      return
    }
    if (hi && hf && (!horarioConsultaValido24h(hi) || !horarioConsultaValido24h(hf))) {
      toast.error("Horários da consulta: use formato 24h HH:MM (ex.: 08:30 e 09:15).")
      return
    }
    const q = Math.max(1, Math.min(999, Number.parseInt(atQtd, 10) || 1))
    const texto = gerarTextoAtestadoBr({
      pacienteNome: paciente.nome,
      pacienteCPF: paciente.cpf,
      tipo: atTipo,
      quantidade: q,
      cid10: normalizarCid10(atCid),
      profissionalNome: usuario?.nome ?? "",
      especialidadeProfissional: modeloAnamnese,
      ...(hi && hf ? { consultaHoraInicio: hi, consultaHoraFim: hf } : {}),
    })
    imprimirAtestadoComTexto(texto)
  }

  const handleSalvarAtestado = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cid10ValidoParaUso(atCid)) {
      toast.error("Informe um CID-10 válido (uma letra e números, ex.: J06.9).")
      return
    }
    const hi = atConsultaInicio.trim()
    const hf = atConsultaFim.trim()
    if ((hi && !hf) || (!hi && hf)) {
      toast.error("Preencha horário de início e fim da consulta, ou deixe os dois em branco.")
      return
    }
    if (hi && hf && (!horarioConsultaValido24h(hi) || !horarioConsultaValido24h(hf))) {
      toast.error("Horários da consulta: use formato 24h HH:MM (ex.: 08:30 e 09:15).")
      return
    }
    const q = Math.max(1, Math.min(999, Number.parseInt(atQtd, 10) || 1))
    const cidNorm = normalizarCid10(atCid)
    criarAtestado.mutate(
      {
        paciente_id: pacienteId,
        tipo: atTipo,
        quantidade: q,
        cid10: cidNorm,
        ...(hi && hf ? { consulta_hora_inicio: hi, consulta_hora_fim: hf } : {}),
      },
      {
        onSuccess: (_data, variables) => {
          if (usuario?.id && !codigoExisteNaLista(variables.cid10)) {
            registrarCid10ManualRecente(usuario.id, variables.cid10)
          }
          setOpenAtestado(false)
          setAtTipo("DIAS")
          setAtQtd("1")
          setAtCid("")
          setAtConsultaInicio("")
          setAtConsultaFim("")
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className={PRONTUARIO_TOOLBAR_OUTLINE}
          >
            <ArrowLeft {...ICO} />
            Voltar
          </Button>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Prontuário do Paciente</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Histórico clínico e evoluções médicas
            </p>
          </div>
        </div>

        {canCreateProntuario && (
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:max-w-[min(100%,42rem)] lg:justify-end">
          {podeFichaClinica && isDentista && (
            <Dialog
              open={openOdonto}
              onOpenChange={(o) => {
                setOpenOdonto(o)
                if (o) setOdontoDraft(criarOdontogramaInicial())
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className={PRONTUARIO_TOOLBAR_OUTLINE}>
                  <LayoutGrid {...ICO} />
                  Odontograma
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Registrar odontograma</DialogTitle>
                <DialogDescription>
                  Marque cada dente (FDI 11–48) e salve. O registro aparece no histórico do paciente e pode ser editado em até 24 horas.
                </DialogDescription>
                <form onSubmit={handleSalvarOdontograma} className="mt-4 space-y-4">
                  <Odontograma value={odontoDraft} onChange={setOdontoDraft} titulo="Exame clínico" />
                  <ModalActions>
                    <ModalButton variant="danger" type="button" onClick={() => setOpenOdonto(false)}>
                      Cancelar
                    </ModalButton>
                    <ModalButton variant="primary" type="submit" disabled={criarProntuario.isPending}>
                      Salvar no prontuário
                    </ModalButton>
                  </ModalActions>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {podeFichaClinica && !isDentista && (
            <Dialog
              open={openMapaDor}
              onOpenChange={(o) => {
                setOpenMapaDor(o)
                if (o) setMapaDraft(criarMapaDeDorInicial())
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className={PRONTUARIO_TOOLBAR_OUTLINE}>
                  <Activity {...ICO} />
                  Mapa de dor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Registrar mapa de dor</DialogTitle>
                <DialogDescription>
                  Marque as regiões com dor e descreva cada uma. O registro fica no histórico do paciente (edição até 24 horas).
                </DialogDescription>
                <form onSubmit={handleSalvarMapaDor} className="mt-4 space-y-4">
                  <MapaDeDor value={mapaDraft} onChange={setMapaDraft} titulo="Avaliação de dor" />
                  <ModalActions>
                    <ModalButton variant="danger" type="button" onClick={() => setOpenMapaDor(false)}>
                      Cancelar
                    </ModalButton>
                    <ModalButton variant="primary" type="submit" disabled={criarProntuario.isPending}>
                      Salvar no prontuário
                    </ModalButton>
                  </ModalActions>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {podeFichaClinica && (
            <Dialog
              open={openAnamnese}
              onOpenChange={(o) => {
                setOpenAnamnese(o)
                if (o) setAnamneseDraft(criarAnamneseInicial(modeloAnamnese))
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className={PRONTUARIO_TOOLBAR_OUTLINE}>
                  <FileText {...ICO} />
                  Anamnese
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Registrar anamnese</DialogTitle>
                <DialogDescription>
                  Formulário conforme sua especialidade. O registro fica no histórico (edição até 24 horas).
                </DialogDescription>
                <form onSubmit={handleSalvarAnamnese} className="mt-4 space-y-4">
                  <AnamneseForm
                    especialidade={modeloAnamnese}
                    value={anamneseDraft}
                    onChange={setAnamneseDraft}
                  />
                  <ModalActions>
                    <ModalButton variant="danger" type="button" onClick={() => setOpenAnamnese(false)}>
                      Cancelar
                    </ModalButton>
                    <ModalButton variant="primary" type="submit" disabled={criarProntuario.isPending}>
                      Salvar no prontuário
                    </ModalButton>
                  </ModalActions>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {podeEmitirAtestado && (
            <Dialog
              open={openAtestado}
              onOpenChange={(o) => {
                setOpenAtestado(o)
                if (o) {
                  setAtTipo("DIAS")
                  setAtQtd("1")
                  setAtCid("")
                  setAtConsultaInicio("")
                  setAtConsultaFim("")
                }
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className={PRONTUARIO_TOOLBAR_OUTLINE}>
                  <FileSignature {...ICO} />
                  Atestado
                </Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[min(90vh,720px)] min-h-0 w-full max-w-2xl flex-col overflow-hidden sm:max-w-2xl">
                <DialogTitle className="shrink-0">Emitir atestado médico</DialogTitle>
                <DialogDescription className="shrink-0">
                  Preencha tipo de afastamento, quantidade e CID-10. O texto é gerado automaticamente. Disponível para
                  médico, fisioterapeuta e dentista cadastrados na clínica.
                </DialogDescription>
                {!paciente ? (
                  <p className="mt-4 shrink-0 text-sm text-amber-800">
                    Não foi possível localizar os dados do paciente na lista carregada. Abra o prontuário a partir da
                    lista de pacientes ou aguarde o carregamento.
                  </p>
                ) : (
                  <form
                    onSubmit={handleSalvarAtestado}
                    className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
                  >
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="atest-tipo">Tipo de afastamento</Label>
                          <Select
                            value={atTipo}
                            onValueChange={(v) => setAtTipo(v as TipoAfastamento)}
                          >
                            <SelectTrigger id="atest-tipo">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DIAS">Dias</SelectItem>
                              <SelectItem value="HORAS">Horas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="atest-qtd">Quantidade</Label>
                          <Input
                            id="atest-qtd"
                            type="number"
                            min={1}
                            max={999}
                            value={atQtd}
                            onChange={(e) => setAtQtd(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          Período em consulta (opcional)
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Se informar início e fim, o texto do atestado inclui o intervalo em que o paciente esteve em
                          consulta médica nesta data (formato 24h).
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="atest-consulta-ini" className="text-xs">
                              Das (hora)
                            </Label>
                            <Input
                              id="atest-consulta-ini"
                              type="time"
                              step={60}
                              value={atConsultaInicio}
                              onChange={(e) => setAtConsultaInicio(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="atest-consulta-fim" className="text-xs">
                              Às (hora)
                            </Label>
                            <Input
                              id="atest-consulta-fim"
                              type="time"
                              step={60}
                              value={atConsultaFim}
                              onChange={(e) => setAtConsultaFim(e.target.value)}
                            />
                          </div>
                        </div>
                        {((atConsultaInicio.trim() && !atConsultaFim.trim()) ||
                          (!atConsultaInicio.trim() && atConsultaFim.trim())) && (
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            Informe as duas horas ou deixe os dois campos vazios.
                          </p>
                        )}
                      </div>
                      <BuscaCID10
                        id="atest-cid"
                        value={atCid}
                        onChange={setAtCid}
                        usuarioId={usuario?.id}
                      />
                      <div className="space-y-2">
                        <Label>Pré-visualização do texto</Label>
                        <pre className="max-h-[min(40vh,240px)] min-h-[100px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-100">
                          {textoPreviewAtestado || "—"}
                        </pre>
                      </div>
                    </div>
                    <ModalActions className="shrink-0 border-t border-slate-100 pt-4 dark:border-slate-700">
                      <ModalButton variant="danger" type="button" onClick={() => setOpenAtestado(false)}>
                        Cancelar
                      </ModalButton>
                      <ModalButton
                        variant="secondary"
                        type="button"
                        disabled={!cid10ValidoParaUso(atCid) || !paciente}
                        title={!cid10ValidoParaUso(atCid) ? "Informe um CID-10 válido para imprimir" : undefined}
                        className="inline-flex"
                        onClick={handleImprimirAtestadoPreview}
                      >
                        <Printer {...modalIconProps} />
                        Imprimir prévia
                      </ModalButton>
                      <ModalButton
                        variant="primary"
                        type="submit"
                        disabled={criarAtestado.isPending || !paciente || !cid10ValidoParaUso(atCid)}
                      >
                        Salvar atestado
                      </ModalButton>
                    </ModalActions>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          )}

          <Dialog
            open={openDialog}
            onOpenChange={(open) => {
              setOpenDialog(open)
              if (open) {
                setNewEntry({ titulo: "", descricao: "" })
                setMapaEvolucao(criarMapaDeDorInicial())
              }
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" variant="default" className={PRONTUARIO_TOOLBAR_PRIMARY}>
                <Plus {...ICO} />
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

                {podeFichaClinica && !isDentista && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-600 dark:bg-slate-900/30">
                    <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                      Mapa de dor — as regiões marcadas entram automaticamente no início da descrição
                    </p>
                    <MapaDeDor
                      value={mapaEvolucao}
                      onChange={(next) => {
                        setMapaEvolucao(next)
                        setNewEntry((prev) => ({
                          ...prev,
                          descricao: sincronizarDescricaoComMapa(prev.descricao, next),
                        }))
                      }}
                      titulo="Regiões com queixa"
                      className="border-0 bg-transparent p-0 shadow-none"
                    />
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

                <ModalActions>
                  <ModalButton variant="danger" type="button" onClick={() => setOpenDialog(false)}>
                    Cancelar
                  </ModalButton>
                  <ModalButton variant="primary" type="submit" className="inline-flex">
                    <Plus {...modalIconProps} />
                    Salvar Evolução
                  </ModalButton>
                </ModalActions>
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
              <Button type="button" variant="outline" className={PRONTUARIO_TOOLBAR_OUTLINE}>
                <ClipboardList {...ICO} />
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
                <ModalActions className="pt-2">
                  <ModalButton variant="danger" type="button" onClick={() => setOpenReceita(false)}>
                    Cancelar
                  </ModalButton>
                  <ModalButton variant="primary" type="submit" disabled={criarProntuario.isPending} className="uppercase tracking-wide">
                    Salvar receituário
                  </ModalButton>
                </ModalActions>
              </form>
            </DialogContent>
          </Dialog>

          {podeFichaClinica && (
            <>
              <Button
                type="button"
                variant="outline"
                className={PRONTUARIO_TOOLBAR_OUTLINE}
                onClick={() => setOpenExames(true)}
              >
                <FlaskConical {...ICO} />
                Solicitação exames
              </Button>
              <SolicitacaoExamesDialog
                open={openExames}
                onOpenChange={setOpenExames}
                especialidadeCodigo={usuario?.especialidade}
                pacienteNome={paciente?.nome}
                pacienteCpf={paciente?.cpf}
                profissionalNome={usuario?.nome}
              />
            </>
          )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <ProntuarioLinhaTempo
          agendas={agendasPassados ?? []}
          atestados={atestadosLista ?? []}
          isLoading={loadingLinhaTempo || loadingAtestados}
        />

        {mostrarSecaoAtestados && (
          <Card className="border-amber-100 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900 dark:text-slate-50">Atestados médicos</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Documentos emitidos para este paciente, vinculados ao profissional que assina. Impressão em folha A4
                apenas com o conteúdo do atestado.
              </p>
            </CardHeader>
            <CardContent>
              {!atestadosLista?.length ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {podeEmitirAtestado
                    ? "Nenhum atestado salvo ainda. Use o botão Atestado acima para emitir."
                    : "Nenhum atestado registrado."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-600">
                  {atestadosLista.map((a) => {
                    const podeImprimir = Boolean(a.texto_gerado?.trim()) && a.cid10 !== "••••"
                    return (
                      <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                            {a.tipo === "HORAS" ? "Horas" : "Dias"}: {a.quantidade} · CID-10: {a.cid10}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {(() => {
                              if (!a.criado_em) return "—"
                              const d = parseISO(a.criado_em)
                              if (!isValid(d)) return "—"
                              return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            })()}
                            {a.profissional?.nome ? ` · ${a.profissional.nome}` : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-2"
                          disabled={!podeImprimir}
                          title={
                            !podeImprimir
                              ? "Impressão indisponível: CID ou texto não visível para seu perfil, ou registro incompleto."
                              : "Abrir impressão (somente o atestado)"
                          }
                          onClick={() => {
                            if (!podeImprimir) {
                              toast.error("CID-10 ou texto do atestado não disponível para impressão neste perfil.")
                              return
                            }
                            imprimirAtestadoComTexto(a.texto_gerado)
                          }}
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {podeFichaClinica && paciente && (
          <PlanoTratamentoSection pacienteId={pacienteId} paciente={paciente} />
        )}

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
                              onClick={() =>
                                handleEdit(prontuario.id, prontuario.descricao || "", prontuario.titulo)
                              }
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
                      {isEditing && editOdonto ? (
                        <Odontograma value={editOdonto} onChange={setEditOdonto} titulo="Editar odontograma" />
                      ) : isEditing && editMapaDor ? (
                        <MapaDeDor value={editMapaDor} onChange={setEditMapaDor} titulo="Editar mapa de dor" />
                      ) : isEditing && editEvolucaoMapa ? (
                        <div className="space-y-4">
                          {podeFichaClinica && !isDentista && (
                            <MapaDeDor
                              value={editEvolucaoMapa}
                              onChange={(next) => {
                                setEditEvolucaoMapa(next)
                                setEditContent((prev) => sincronizarDescricaoComMapa(prev, next))
                              }}
                              titulo="Mapa de dor (integrado a esta evolução)"
                            />
                          )}
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                              Texto da evolução
                            </label>
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={8}
                              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                              placeholder="Digite a evolução clínica..."
                            />
                          </div>
                        </div>
                      ) : isEditing && editAnamnese ? (
                        <AnamneseForm
                          especialidade={editAnamnese.especialidade}
                          value={editAnamnese.respostas}
                          onChange={(r) => setEditAnamnese({ ...editAnamnese, respostas: r })}
                        />
                      ) : isEditing ? (
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={8}
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="Digite a evolução clínica..."
                        />
                      ) : isTituloOdontograma(prontuario.titulo) ? (
                        (() => {
                          const parsed = deserializarOdontograma(prontuario.descricao || "")
                          return parsed ? (
                            <Odontograma value={parsed} readOnly className="border-0 shadow-none px-0" />
                          ) : (
                            <p className="text-sm text-amber-800">
                              Registro de odontograma em formato não reconhecido. Conteúdo bruto:{" "}
                              <span className="font-mono text-xs">{(prontuario.descricao || "").slice(0, 200)}</span>
                            </p>
                          )
                        })()
                      ) : isTituloMapaDeDor(prontuario.titulo) ? (
                        (() => {
                          const parsed = deserializarMapaDeDor(prontuario.descricao || "")
                          return parsed ? (
                            <MapaDeDor value={parsed} readOnly className="border-0 shadow-none px-0" />
                          ) : (
                            <p className="text-sm text-amber-800">
                              Registro de mapa de dor em formato não reconhecido.
                            </p>
                          )
                        })()
                      ) : isTituloAnamnese(prontuario.titulo) ? (
                        (() => {
                          const parsed = deserializarAnamnese(prontuario.descricao || "")
                          return parsed ? (
                            <AnamneseForm
                              especialidade={parsed.especialidade}
                              value={parsed.respostas}
                              readOnly
                              className="border-0 shadow-none px-0"
                            />
                          ) : (
                            <p className="text-sm text-amber-800">
                              Registro de anamnese em formato não reconhecido.
                            </p>
                          )
                        })()
                      ) : (
                        (() => {
                          const parsed = parseConteudoEvolucao(prontuario.descricao || "")
                          if (parsed.kind === "com_mapa") {
                            return (
                              <div className="space-y-4">
                                <div className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                                  {parsed.texto?.trim() ? parsed.texto : "—"}
                                </div>
                                <MapaDeDor
                                  value={parsed.mapa}
                                  readOnly
                                  className="border border-slate-200 shadow-sm dark:border-slate-600"
                                  titulo="Mapa de dor nesta evolução"
                                />
                              </div>
                            )
                          }
                          return (
                            <div className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                              {parsed.texto?.trim() ? parsed.texto : "Sem descrição"}
                            </div>
                          )
                        })()
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