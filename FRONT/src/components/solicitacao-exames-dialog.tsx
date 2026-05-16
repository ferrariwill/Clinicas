"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { FlaskConical, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import {
  catalogoExamesParaEspecialidade,
  labelContextoExames,
  type ItemExameSugerido,
} from "@/lib/solicitacao-exames-catalogo"
import { abrirImpressaoSolicitacaoExames } from "@/lib/utils/solicitacao-exames-print"
import { toast } from "sonner"

export interface SolicitacaoExamesDialogProps {
  /** Código MEDICO | FISIOTERAPEUTA | DENTISTA do profissional logado (ou vazio → lista médica). */
  especialidadeCodigo?: string | null
  pacienteNome?: string
  pacienteCpf?: string
  clinicaNome?: string
  profissionalNome?: string
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SolicitacaoExamesDialog({
  especialidadeCodigo,
  pacienteNome,
  pacienteCpf,
  clinicaNome,
  profissionalNome,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: SolicitacaoExamesDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = useCallback(
    (v: boolean) => {
      if (onOpenChange) onOpenChange(v)
      if (!isControlled) setUncontrolledOpen(v)
    },
    [isControlled, onOpenChange]
  )

  const itensCatalogo: ItemExameSugerido[] = useMemo(
    () => catalogoExamesParaEspecialidade(especialidadeCodigo),
    [especialidadeCodigo]
  )
  const [marcados, setMarcados] = useState<Record<string, boolean>>({})
  const [observacoes, setObservacoes] = useState("")

  useEffect(() => {
    if (!open) return
    const init: Record<string, boolean> = {}
    for (const it of itensCatalogo) init[it.id] = false
    setMarcados(init)
    setObservacoes("")
  }, [open, itensCatalogo])

  const tituloContexto = useMemo(() => labelContextoExames(especialidadeCodigo), [especialidadeCodigo])

  const toggle = (id: string) => {
    setMarcados((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const marcarTodos = () => {
    const next: Record<string, boolean> = {}
    for (const it of itensCatalogo) next[it.id] = true
    setMarcados(next)
  }

  const limparTodos = () => {
    const next: Record<string, boolean> = {}
    for (const it of itensCatalogo) next[it.id] = false
    setMarcados(next)
  }

  const handleGerarPdf = () => {
    const nomes: string[] = []
    for (const it of itensCatalogo) {
      if (marcados[it.id]) nomes.push(it.nome)
    }
    const obs = observacoes.trim()
    if (nomes.length === 0 && !obs) {
      toast.error("Marque ao menos um exame ou preencha as observações.")
      return
    }
    const itensPdf = nomes.length > 0 ? nomes : ["Solicitação conforme observações abaixo."]
    const dataStr = format(new Date(), "dd/MM/yyyy", { locale: ptBR })
    const ok = abrirImpressaoSolicitacaoExames({
      itens: itensPdf,
      observacoes: obs || undefined,
      clinicaNome,
      pacienteNome,
      pacienteCpf,
      profissionalNome,
      dataExibicao: dataStr,
    })
    if (!ok) {
      toast.error("Não foi possível abrir a impressão. Verifique bloqueio de pop-ups.")
      return
    }
    toast.success("Impressão aberta. Escolha «Salvar como PDF» no diálogo do navegador.")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" stackZ="z-[100]">
        <DialogTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 shrink-0 text-sky-700" aria-hidden />
          Solicitação de exames
        </DialogTitle>
        <DialogDescription>{tituloContexto}. Marque os exames e gere o documento para o paciente levar ao laboratório ou imagem.</DialogDescription>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={marcarTodos}>
            Marcar todos
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={limparTodos}>
            Limpar
          </Button>
        </div>

        <div className="mt-3 max-h-[min(50vh,360px)] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          {itensCatalogo.map((it) => (
            <label
              key={it.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-2 hover:border-slate-200 hover:bg-white"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={Boolean(marcados[it.id])}
                onChange={() => toggle(it.id)}
              />
              <span className="text-sm text-slate-800">{it.nome}</span>
            </label>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="sol-exames-obs">Outros exames ou orientações (opcional)</Label>
          <textarea
            id="sol-exames-obs"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex.: USG de abdome total; repetir TSH em 30 dias; jejum de 12 h para laboratório…"
            className="flex min-h-[72px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <ModalActions className="pt-2">
          <ModalButton variant="danger" type="button" onClick={() => setOpen(false)}>
            Fechar
          </ModalButton>
          <ModalButton variant="primary" type="button" className="inline-flex" onClick={handleGerarPdf}>
            <Printer {...modalIconProps} />
            Gerar PDF (impressão)
          </ModalButton>
        </ModalActions>
      </DialogContent>
    </Dialog>
  )
}
