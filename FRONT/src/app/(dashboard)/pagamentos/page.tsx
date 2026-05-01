"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/hooks/use-auth"
import { computeTelasLiberadas, useMinhasPermissoesRotas } from "@/hooks/use-minhas-permissoes-rotas"
import { mapAgendaFromAPI } from "@/hooks/use-agenda"
import { apiClient } from "@/services/api-client"
import type { AgendaResponse, CobrancaConsultaResponse } from "@/types/api"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MetricCardSkeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageCircle } from "lucide-react"
import { toast } from "sonner"

type FilaItem = AgendaResponse & { paciente_telefone?: string }

function mapFilaItem(raw: Record<string, unknown>): FilaItem {
  const a = mapAgendaFromAPI(raw)
  const pac = raw.Paciente as Record<string, unknown> | undefined
  const tel = pac?.telefone ?? pac?.Telefone
  return {
    ...a,
    paciente_telefone: typeof tel === "string" ? tel : "",
  }
}

function parseValorBR(s: string): number {
  const t = s.trim().replace(/\s/g, "")
  if (!t) return NaN
  if (t.includes(",")) {
    return Number(t.replace(/\./g, "").replace(",", "."))
  }
  return Number(t)
}

function mapCobranca(raw: Record<string, unknown>): CobrancaConsultaResponse {
  const id = raw.id ?? raw.ID
  const vr = raw.valor_recebido ?? raw.ValorRecebido
  const tr = raw.troco ?? raw.Troco
  return {
    id: String(id ?? ""),
    clinica_id: String(raw.clinica_id ?? raw.ClinicaID ?? ""),
    agenda_id: String(raw.agenda_id ?? raw.AgendaID ?? ""),
    valor_bruto: Number(raw.valor_bruto ?? raw.ValorBruto ?? 0),
    percentual_split_snapshot: Number(raw.percentual_split_snapshot ?? raw.PercentualSplitSnapshot ?? 0),
    taxa_sistema_valor: Number(raw.taxa_sistema_valor ?? raw.TaxaSistemaValor ?? 0),
    taxa_gateway_valor: Number(raw.taxa_gateway_valor ?? raw.TaxaGatewayValor ?? 0),
    valor_liquido_clinica: Number(raw.valor_liquido_clinica ?? raw.ValorLiquidoClinica ?? 0),
    status: String(raw.status ?? raw.Status ?? ""),
    metodo: String(raw.metodo ?? raw.Metodo ?? ""),
    valor_recebido: vr == null ? undefined : Number(vr),
    troco: tr == null ? undefined : Number(tr),
    asaas_payment_id: String(raw.asaas_payment_id ?? raw.AsaasPaymentID ?? ""),
    pix_copia_e_cola: String(raw.pix_copia_e_cola ?? raw.PixCopiaECola ?? ""),
    pix_qr_code_base64: String(raw.pix_qr_code_base64 ?? raw.PixQRCodeBase64 ?? ""),
    link_pagamento: String(raw.link_pagamento ?? raw.LinkPagamento ?? ""),
  }
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, "")
}

type MetodoCobranca = "PIX" | "CREDIT_CARD" | "DINHEIRO" | "MANUAL"

export default function PagamentosPage() {
  const router = useRouter()
  const { usuario, userRole } = useAuth()
  const clinicaId = useAuthStore((s) => s.clinicaId)
  const { data: permRotas, isSuccess: permissoesOk } = useMinhasPermissoesRotas()
  const { podePagamentos } = useMemo(
    () => computeTelasLiberadas(permissoesOk ? permRotas : undefined, userRole),
    [permRotas, userRole, permissoesOk]
  )

  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<FilaItem | null>(null)
  const [cob, setCob] = useState<CobrancaConsultaResponse | null>(null)
  const [fluxoDinheiro, setFluxoDinheiro] = useState(false)
  const [valorRecebidoTxt, setValorRecebidoTxt] = useState("")
  const [metodoEscolhido, setMetodoEscolhido] = useState<MetodoCobranca | "">("")

  const queryClient = useQueryClient()

  const configQuery = useQuery({
    queryKey: ["clinica-config-pagamentos", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return null
      const d = await apiClient.getConfiguracoes(clinicaId)
      return d as Record<string, unknown>
    },
    enabled: permissoesOk && podePagamentos && Boolean(clinicaId),
  })

  const cadastroAsaas = useMemo(() => {
    const d = configQuery.data
    if (!d) return true
    const v = d.cadastro_asaas_ativo ?? d.CadastroAsaasAtivo
    if (v === undefined || v === null) return true
    return Boolean(v)
  }, [configQuery.data])

  const filaQuery = useQuery({
    queryKey: ["cobrancas-fila"],
    queryFn: async () => {
      const d = await apiClient.getCobrancasFila()
      const raw = (d.fila ?? []) as Record<string, unknown>[]
      return raw.map(mapFilaItem)
    },
    enabled: permissoesOk && podePagamentos,
  })

  const valorDevido = sel?.valor_total ?? 0
  const valorRecebidoNum = parseValorBR(valorRecebidoTxt)
  const trocoPreview =
    Number.isFinite(valorRecebidoNum) && valorRecebidoNum >= valorDevido
      ? Math.round((valorRecebidoNum - valorDevido) * 100) / 100
      : null

  const criar = useMutation({
    mutationFn: async (p: { agendaId: string; metodo: MetodoCobranca; valorRecebido?: number }) => {
      const r = await apiClient.criarCobranca(p.agendaId, p.metodo, p.valorRecebido)
      const raw = r.cobranca as Record<string, unknown> | undefined
      if (!raw) throw new Error("Resposta sem cobrança")
      return mapCobranca(raw)
    },
    onSuccess: (c) => {
      setCob(c)
      toast.success(c.status === "PAGO" ? "Pagamento confirmado." : "Cobrança gerada.")
      queryClient.invalidateQueries({ queryKey: ["cobrancas-fila"] })
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; response?: { data?: { erro?: string } } }
      toast.error(err.response?.data?.erro || err.message || "Erro ao gerar cobrança")
    },
  })

  if (!usuario) return null
  if (!permissoesOk || !podePagamentos) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900">
        <p className="font-medium">Sem permissão para Pagamentos</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Voltar
        </Button>
      </div>
    )
  }

  const abrirFechamento = (item: FilaItem) => {
    setSel(item)
    setCob(null)
    setFluxoDinheiro(false)
    setValorRecebidoTxt("")
    setMetodoEscolhido("")
    setOpen(true)
  }

  const fecharDialog = (o: boolean) => {
    setOpen(o)
    if (!o) {
      setSel(null)
      setCob(null)
      setFluxoDinheiro(false)
      setValorRecebidoTxt("")
      setMetodoEscolhido("")
    }
  }

  const confirmarDinheiro = () => {
    if (!sel) return
    const vr = parseValorBR(valorRecebidoTxt)
    if (!Number.isFinite(vr) || vr < valorDevido - 0.004) {
      toast.error("Informe o valor recebido (deve ser maior ou igual ao valor da consulta).")
      return
    }
    criar.mutate({ agendaId: sel.id, metodo: "DINHEIRO", valorRecebido: vr })
  }

  const confirmarMetodoSelecionado = () => {
    if (!sel) return
    if (!metodoEscolhido) {
      toast.error("Selecione um método de cobrança.")
      return
    }
    if (metodoEscolhido === "DINHEIRO") {
      setFluxoDinheiro(true)
      return
    }
    criar.mutate({ agendaId: sel.id, metodo: metodoEscolhido })
  }

  const waBase = (phone: string, text: string) => {
    const d = onlyDigits(phone)
    if (d.length < 10) {
      toast.error("Telefone do paciente incompleto para WhatsApp.")
      return
    }
    const n = d.startsWith("55") ? d : `55${d}`
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
  }

  const msgPix = (c: CobrancaConsultaResponse) =>
    `Olá! Segue o Pix para pagamento da consulta (R$ ${c.valor_bruto.toFixed(2)}):\n\n${c.pix_copia_e_cola || ""}`

  const msgCartao = (c: CobrancaConsultaResponse) =>
    `Olá! Segue o link para pagamento com cartão (R$ ${c.valor_bruto.toFixed(2)}):\n\n${c.link_pagamento || ""}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pagamentos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Consultas realizadas e liberadas para cobrança. Com cadastro Asaas, Pix e cartão usam o gateway; sem cadastro, Pix e
          cartão registram baixa imediata pelo valor da consulta (como dinheiro). Dinheiro e confirmação na recepção também
          fecham na hora.
        </p>
      </div>

      {filaQuery.isPending && (
        <div className="space-y-3">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      )}

      {!filaQuery.isPending && (filaQuery.data?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-600">
            Nenhum paciente na fila de pagamento. Com cobrança na recepção ativa, consultas particulares entram aqui ao serem
            marcadas como Realizado. Convênio não entra nesta fila. Se necessário, use &quot;Liberar cobrança&quot; em
            Atendimentos (ex.: registros antigos).
          </CardContent>
        </Card>
      )}

      {!filaQuery.isPending && (filaQuery.data?.length ?? 0) > 0 && (
        <div className="space-y-3">
          {filaQuery.data!.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{a.paciente_nome || `Paciente #${a.paciente_id}`}</CardTitle>
                <p className="text-xs text-slate-500">
                  {(() => {
                    try {
                      return format(parseISO(a.data_horario), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    } catch {
                      return a.data_horario
                    }
                  })()}{" "}
                  · Total R$ {(a.valor_total ?? 0).toFixed(2)}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => abrirFechamento(a)}>
                  Fechar conta / cobrar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={fecharDialog}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Fechamento de conta</DialogTitle>
          <DialogDescription>
            {sel?.paciente_nome} — valor R$ {(sel?.valor_total ?? 0).toFixed(2)}
          </DialogDescription>

          {configQuery.isSuccess && !cadastroAsaas && (
            <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Cadastro Asaas desativado: Pix e cartão aqui só registram o recebimento na recepção (baixa imediata pelo valor da
              consulta), sem QR nem link do Asaas.
            </p>
          )}

          {!cob && sel && !fluxoDinheiro && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metodo-cobranca">Método de cobrança</Label>
                <Select
                  value={metodoEscolhido || undefined}
                  onValueChange={(v) => setMetodoEscolhido(v as MetodoCobranca)}
                >
                  <SelectTrigger id="metodo-cobranca" className="w-full">
                    <SelectValue placeholder="Escolha o método…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">
                      {cadastroAsaas ? "Pix — QR e copia e cola (Asaas)" : "Pix — baixa imediata na recepção"}
                    </SelectItem>
                    <SelectItem value="CREDIT_CARD">
                      {cadastroAsaas ? "Cartão — link de pagamento (Asaas)" : "Cartão — baixa imediata na recepção"}
                    </SelectItem>
                    <SelectItem value="DINHEIRO">Dinheiro — informar valor recebido e troco</SelectItem>
                    <SelectItem value="MANUAL">Confirmar pagamento na recepção (outros / acordo)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Escolha no menu e use Confirmar para evitar acionamento acidental.
                </p>
              </div>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={criar.isPending || !metodoEscolhido}
                onClick={confirmarMetodoSelecionado}
              >
                Confirmar método
              </Button>
            </div>
          )}

          {!cob && sel && fluxoDinheiro && (
            <div className="mt-4 space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-mt-1 px-0"
                onClick={() => {
                  setFluxoDinheiro(false)
                  setMetodoEscolhido("")
                }}
              >
                ← Voltar
              </Button>
              <div className="space-y-1">
                <Label>Valor a pagar</Label>
                <p className="text-lg font-semibold text-slate-900">R$ {valorDevido.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="vr">Valor recebido (R$)</Label>
                <Input
                  id="vr"
                  inputMode="decimal"
                  placeholder="ex: 150,00"
                  value={valorRecebidoTxt}
                  onChange={(e) => setValorRecebidoTxt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Troco</Label>
                <p className="text-sm font-medium text-slate-800">
                  {trocoPreview == null ? "—" : `R$ ${trocoPreview.toFixed(2)}`}
                </p>
              </div>
              <Button type="button" disabled={criar.isPending} onClick={confirmarDinheiro}>
                Confirmar pagamento em dinheiro
              </Button>
            </div>
          )}

          {cob &&
            cob.status === "PAGO" &&
            (cob.metodo === "MANUAL" ||
              cob.metodo === "DINHEIRO" ||
              ((cob.metodo === "PIX" || cob.metodo === "CREDIT_CARD") && !String(cob.asaas_payment_id ?? "").trim())) && (
            <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              <p className="font-medium">Pagamento registrado como pago.</p>
              <p>Valor bruto: R$ {cob.valor_bruto.toFixed(2)} · Líquido clínica: R$ {cob.valor_liquido_clinica.toFixed(2)}</p>
              {cob.metodo === "DINHEIRO" && cob.valor_recebido != null && (
                <>
                  <p>Valor recebido: R$ {Number(cob.valor_recebido).toFixed(2)}</p>
                  <p>Troco: R$ {(cob.troco ?? 0).toFixed(2)}</p>
                </>
              )}
              {(cob.metodo === "PIX" || cob.metodo === "CREDIT_CARD") && !String(cob.asaas_payment_id ?? "").trim() && (
                <p className="text-xs text-emerald-900/90">Registro na recepção (sem cobrança no Asaas).</p>
              )}
            </div>
          )}

          {cob && cob.metodo === "PIX" && cob.status === "AGUARDANDO_PAGAMENTO" && (
            <div className="mt-4 space-y-3">
              {cob.pix_qr_code_base64 && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="QR Code Pix"
                    className="h-48 w-48 rounded-lg border border-slate-200 bg-white p-2"
                    src={`data:image/png;base64,${cob.pix_qr_code_base64}`}
                  />
                </div>
              )}
              <p className="text-xs text-slate-600 break-all">Pix copia e cola: {cob.pix_copia_e_cola}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    if (sel?.paciente_telefone) waBase(sel.paciente_telefone, msgPix(cob))
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar Pix por WhatsApp
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(cob.pix_copia_e_cola || "")}>
                  Copiar código
                </Button>
              </div>
            </div>
          )}

          {cob && cob.metodo === "CREDIT_CARD" && cob.status === "AGUARDANDO_PAGAMENTO" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-700">Link de pagamento gerado no Asaas.</p>
              <Button
                type="button"
                variant="default"
                className="gap-2"
                onClick={() => {
                  if (sel?.paciente_telefone) waBase(sel.paciente_telefone, msgCartao(cob))
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar link por WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
