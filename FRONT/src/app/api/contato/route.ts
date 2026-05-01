import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

/** Destino das mensagens do formulário da landing page. */
const DEFAULT_CONTACT_EMAIL = "contato@facilitaclin.com.br"

function contactRecipient(): string {
  const a = process.env.CONTACT_EMAIL?.trim()
  if (a) return a
  const b = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
  if (b) return b
  return DEFAULT_CONTACT_EMAIL
}

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 })
  }

  const body = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

  const nome = typeof body.nome === "string" ? body.nome.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const clinica = typeof body.clinica === "string" ? body.clinica.trim() : ""
  const mensagem = typeof body.mensagem === "string" ? body.mensagem.trim() : ""

  if (!nome || !email || !mensagem) {
    return NextResponse.json({ error: "Nome, e-mail e mensagem são obrigatórios." }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 })
  }

  const host = process.env.SMTP_HOST?.trim()
  const portStr = process.env.SMTP_PORT?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.SMTP_FROM?.trim()

  if (!host || !portStr || !user || !pass || !from) {
    return NextResponse.json(
      { error: "Envio não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no .env." },
      { status: 503 },
    )
  }

  const port = Number.parseInt(portStr, 10)
  if (Number.isNaN(port)) {
    return NextResponse.json({ error: "SMTP_PORT inválido." }, { status: 503 })
  }

  const to = contactRecipient()
  let transport
  try {
    transport = nodemailer.createTransport({ host, port, auth: { user, pass } })
    await transport.sendMail({
      from,
      to,
      replyTo: `${nome} <${email}>`,
      subject: `Contato pelo site — ${clinica || nome}`,
      text: [
        `Nome: ${nome}`,
        `E-mail: ${email}`,
        `Clínica/consultório: ${clinica || "(não informado)"}`,
        "",
        mensagem,
      ].join("\n"),
    })
  } catch {
    return NextResponse.json({ error: "Falha ao enviar e-mail. Tente mais tarde ou use o link de e-mail na página." }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
