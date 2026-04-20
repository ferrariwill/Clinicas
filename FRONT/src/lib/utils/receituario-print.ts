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

/**
 * Abre janela com o receituário formatado e dispara o diálogo de impressão.
 * Em Chrome/Edge: em "Destino" escolha "Salvar como PDF" para exportar PDF.
 */
export function abrirImpressaoReceituario(opts: {
  conteudo: string
  clinicaNome?: string
  pacienteRef?: string
  profissionalNome?: string
  dataExibicao?: string
}): boolean {
  const w = window.open("", "_blank", "noopener,noreferrer,width=820,height=960")
  if (!w) return false

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

  w.document.open()
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Receituário</title>
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
</body></html>`)
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
}
