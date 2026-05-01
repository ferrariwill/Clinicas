/** Escape mínimo para conteúdo inserido em HTML estático (janela de impressão). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function isTituloReceituario(titulo: string): boolean {
  return /receitu[áa]rio/i.test((titulo || "").trim())
}

function montarHtmlReceituario(opts: {
  conteudo: string
  clinicaNome?: string
  pacienteRef?: string
  profissionalNome?: string
  dataExibicao?: string
}): string {
  const clin = opts.clinicaNome
    ? `<p><strong>CLÍNICA:</strong> ${escapeHtml(opts.clinicaNome)}</p>`
    : ""
  const pac = opts.pacienteRef
    ? `<p><strong>PACIENTE:</strong> ${escapeHtml(opts.pacienteRef)}</p>`
    : ""
  const prof = opts.profissionalNome
    ? `<p><strong>PROFISSIONAL:</strong> ${escapeHtml(opts.profissionalNome)}</p>`
    : ""
  const dt = opts.dataExibicao ? `<p><strong>DATA:</strong> ${escapeHtml(opts.dataExibicao)}</p>` : ""

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Receituário</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px; max-width: 720px; margin: 0 auto; color: #111; }
  pre { white-space: pre-wrap; font-size: 11pt; line-height: 1.45; margin-top: 16px; }
  h1 { font-size: 16pt; margin: 0 0 12px; letter-spacing: 0.05em; }
  .meta p { margin: 4px 0; font-size: 10pt; }
  @media print {
    .no-print { display: none !important; }
    body { padding: 12mm; }
  }
</style></head><body>
  <h1>RECEITUÁRIO</h1>
  <div class="meta">${clin}${pac}${prof}${dt}</div>
  <pre>${escapeHtml(opts.conteudo)}</pre>
  <p class="no-print" style="margin-top:24px;font-size:10pt;color:#555">
    Dica: Ctrl+P (ou Cmd+P) — no destino da impressora, escolha <strong>Salvar como PDF</strong> para gerar o arquivo PDF.
  </p>
</body></html>`
}

/**
 * Abre o diálogo de impressão com o receituário formatado (sem depender de pop-up).
 * Em Chrome/Edge: em "Destino" escolha "Salvar como PDF" para exportar PDF.
 *
 * Nota: antes usávamos `window.open` com `noopener`, o que faz o retorno ser `null`
 * em navegadores modernos — parecia bloqueio de pop-up mesmo com pop-ups liberados.
 */
export function abrirImpressaoReceituario(opts: {
  conteudo: string
  clinicaNome?: string
  pacienteRef?: string
  profissionalNome?: string
  dataExibicao?: string
}): boolean {
  const html = montarHtmlReceituario(opts)

  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", "Receituário — impressão")
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
    return tentarImpressaoPorNovaJanela(html)
  }

  try {
    doc.open()
    doc.write(html)
    doc.close()
  } catch {
    iframe.remove()
    return tentarImpressaoPorNovaJanela(html)
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

  // Dar tempo ao motor de layout antes do print (evita folha em branco em alguns browsers)
  setTimeout(triggerPrint, 300)
  return true
}

/** Fallback: nova janela sem `noopener` para o retorno de `window.open` não ser `null`. */
function tentarImpressaoPorNovaJanela(html: string): boolean {
  const w = window.open("", "receituario_print", "width=820,height=960")
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
