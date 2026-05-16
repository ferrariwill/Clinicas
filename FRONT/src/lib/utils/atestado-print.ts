import { escapeHtml } from "@/lib/utils/receituario-print"

function montarHtmlAtestado(opts: {
  textoCorpo: string
  clinicaNome?: string
}): string {
  const clin = opts.clinicaNome
    ? `<p class="clinica-top">${escapeHtml(opts.clinicaNome)}</p>`
    : ""
  const corpo = escapeHtml(opts.textoCorpo)

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Atestado médico</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }
  .folha {
    max-width: 180mm;
    margin: 0 auto;
    padding: 8mm 10mm 14mm;
    min-height: 260mm;
  }
  .clinica-top {
    text-align: center;
    font-size: 10pt;
    margin: 0 0 10mm;
    letter-spacing: 0.04em;
  }
  pre.corpo {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: inherit;
    font-size: 12pt;
    margin: 0;
    padding: 0;
  }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .folha { padding: 0; max-width: none; min-height: auto; }
  }
</style></head><body>
  <div class="folha">
    ${clin}
    <pre class="corpo">${corpo}</pre>
  </div>
  <p class="no-print" style="margin:16px;text-align:center;font-size:10pt;color:#555;font-family:system-ui,sans-serif">
    Use Ctrl+P (Cmd+P) e escolha <strong>Salvar como PDF</strong> ou sua impressora.
  </p>
</body></html>`
}

/**
 * Abre impressão apenas do atestado (A4), sem elementos do sistema (iframe dedicado).
 */
export function abrirImpressaoAtestado(opts: { textoCorpo: string; clinicaNome?: string }): boolean {
  const html = montarHtmlAtestado(opts)

  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", "Atestado — impressão")
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
    return tentarImpressaoAtestadoNovaJanela(html)
  }

  try {
    doc.open()
    doc.write(html)
    doc.close()
  } catch {
    iframe.remove()
    return tentarImpressaoAtestadoNovaJanela(html)
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

function tentarImpressaoAtestadoNovaJanela(html: string): boolean {
  const w = window.open("", "atestado_print", "width=840,height=1100")
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
