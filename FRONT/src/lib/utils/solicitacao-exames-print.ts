import { escapeHtml } from "@/lib/utils/receituario-print"

function montarHtmlSolicitacaoExames(opts: {
  itens: string[]
  observacoes?: string
  clinicaNome?: string
  pacienteNome?: string
  pacienteCpf?: string
  profissionalNome?: string
  dataExibicao: string
}): string {
  const clin = opts.clinicaNome
    ? `<p class="meta"><strong>Clínica:</strong> ${escapeHtml(opts.clinicaNome)}</p>`
    : ""
  const pac =
    opts.pacienteNome || opts.pacienteCpf
      ? `<p class="meta"><strong>Paciente:</strong> ${escapeHtml(opts.pacienteNome ?? "—")}${
          opts.pacienteCpf ? ` — CPF: ${escapeHtml(opts.pacienteCpf)}` : ""
        }</p>`
      : ""
  const prof = opts.profissionalNome
    ? `<p class="meta"><strong>Solicitante:</strong> ${escapeHtml(opts.profissionalNome)}</p>`
    : ""
  const dt = `<p class="meta"><strong>Data:</strong> ${escapeHtml(opts.dataExibicao)}</p>`

  const li = opts.itens.map((nome) => `<li>${escapeHtml(nome)}</li>`).join("")
  const obs =
    opts.observacoes && opts.observacoes.trim()
      ? `<div class="obs"><strong>Observações:</strong><br/>${escapeHtml(opts.observacoes.trim()).replace(/\n/g, "<br/>")}</div>`
      : ""

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Solicitação de exames</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.45;
    color: #000;
    background: #fff;
  }
  .folha {
    max-width: 180mm;
    margin: 0 auto;
    padding: 8mm 10mm 14mm;
    min-height: 260mm;
  }
  h1 {
    text-align: center;
    font-size: 15pt;
    letter-spacing: 0.08em;
    margin: 0 0 10mm;
    border-bottom: 2px solid #000;
    padding-bottom: 4mm;
  }
  .meta { margin: 3mm 0; font-size: 11pt; }
  ul.exames {
    margin: 8mm 0 6mm 5mm;
    padding: 0 0 0 6mm;
  }
  ul.exames li { margin: 2mm 0; }
  .obs {
    margin-top: 8mm;
    font-size: 11pt;
    padding: 4mm;
    border: 1px solid #333;
  }
  .rodape-assinatura {
    margin-top: 18mm;
    font-size: 10pt;
    text-align: center;
  }
  .linha-assinatura {
    margin: 14mm auto 4mm;
    max-width: 80mm;
    border-bottom: 1px solid #000;
  }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .folha { padding: 0; max-width: none; min-height: auto; }
  }
</style></head><body>
  <div class="folha">
    <h1>SOLICITAÇÃO DE EXAMES</h1>
    ${clin}${pac}${prof}${dt}
    <p style="margin-top:8mm;font-size:11pt"><strong>Exames solicitados:</strong></p>
    <ul class="exames">${li}</ul>
    ${obs}
    <div class="rodape-assinatura">
      <div class="linha-assinatura"></div>
      Assinatura e carimbo do profissional solicitante
    </div>
  </div>
  <p class="no-print" style="margin:16px;text-align:center;font-size:10pt;color:#555;font-family:system-ui,sans-serif">
    Use Ctrl+P (Cmd+P) e escolha <strong>Salvar como PDF</strong> para gerar o arquivo para o laboratório.
  </p>
</body></html>`
}

function tentarNovaJanela(html: string): boolean {
  const w = window.open("", "solicitacao_exames_print", "width=820,height=960")
  if (!w) return false
  try {
    w.opener = null
  } catch {
    /* ignore */
  }
  try {
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => {
      try {
        w.print()
      } catch {
        /* ignore */
      }
    }, 200)
    return true
  } catch {
    try {
      w.close()
    } catch {
      /* ignore */
    }
    return false
  }
}

/**
 * Abre a impressão da solicitação de exames (A4). No navegador, use "Salvar como PDF" como destino.
 */
export function abrirImpressaoSolicitacaoExames(opts: {
  itens: string[]
  observacoes?: string
  clinicaNome?: string
  pacienteNome?: string
  pacienteCpf?: string
  profissionalNome?: string
  dataExibicao: string
}): boolean {
  if (!opts.itens.length) return false
  const html = montarHtmlSolicitacaoExames(opts)

  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", "Solicitação de exames — impressão")
  iframe.setAttribute("aria-hidden", "true")
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  })
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  if (!win || !doc) {
    iframe.remove()
    return tentarNovaJanela(html)
  }

  try {
    doc.open()
    doc.write(html)
    doc.close()
  } catch {
    iframe.remove()
    return tentarNovaJanela(html)
  }

  const cleanup = () => {
    try {
      iframe.remove()
    } catch {
      /* ignore */
    }
  }

  let done = false
  const triggerPrint = () => {
    if (done) return
    done = true
    try {
      win.focus()
      win.print()
    } catch {
      cleanup()
      return
    }
    setTimeout(cleanup, 2000)
  }

  setTimeout(triggerPrint, 300)
  return true
}
