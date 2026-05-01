"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  Loader2,
  Menu,
  MessageCircle,
  PieChart,
  Shield,
  Sparkles,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

const CONTACT_MAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contato@facilitaclin.com.br"

export function MarketingLanding() {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-sky-50/50 text-slate-800">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl motion-reduce:animate-none md:h-[36rem] md:w-[56rem]" />
        <div className="absolute bottom-0 right-[-15%] h-80 w-80 rounded-full bg-teal-100/50 blur-3xl" />
        <div className="absolute left-[-8%] top-1/3 h-64 w-64 rounded-full bg-cyan-100/40 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[4.25rem] sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20">
              <HeartPulse className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg sm:text-xl">Facilita Clin</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#solucoes" className="transition hover:text-sky-700">
              Soluções
            </a>
            <a href="#diferenciais" className="transition hover:text-sky-700">
              Diferenciais
            </a>
            <a href="#contato" className="transition hover:text-sky-700">
              Contato
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition hover:bg-sky-700 sm:inline-flex"
            >
              Entrar
            </Link>
            <button
              type="button"
              className="inline-flex rounded-lg p-2 text-slate-700 md:hidden hover:bg-slate-100"
              aria-expanded={mobileNav}
              aria-label={mobileNav ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMobileNav((v) => !v)}
            >
              {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileNav ? (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium">
              <a href="#solucoes" className="py-2 text-slate-700" onClick={() => setMobileNav(false)}>
                Soluções
              </a>
              <a href="#diferenciais" className="py-2 text-slate-700" onClick={() => setMobileNav(false)}>
                Diferenciais
              </a>
              <a href="#contato" className="py-2 text-slate-700" onClick={() => setMobileNav(false)}>
                Contato
              </a>
              <Link
                href="/login"
                className="mt-2 rounded-xl bg-sky-600 py-3 text-center font-semibold text-white hover:bg-sky-700"
                onClick={() => setMobileNav(false)}
              >
                Entrar na plataforma
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-14 text-center sm:px-6 sm:pt-20 lg:pb-28 lg:pt-24">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-700 sm:text-sm">
            <Sparkles className="h-4 w-4 text-sky-600" aria-hidden />
            Software para clínicas e consultórios
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.1]">
            A gestão da sua clínica,{" "}
            <span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
              simples e profissional
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Agendamento, prontuário, financeiro e cobrança em um só lugar. Multi-clínica, seguro e pronto para escalar sua
            operação com a imagem da sua marca.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <Link
              href="/login"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:from-sky-600 hover:to-teal-600 sm:w-auto"
            >
              Acessar o sistema
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a
              href="#contato"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/80 sm:w-auto"
            >
              Falar com vendas
            </a>
          </div>
          <ul className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-600 sm:text-sm">
            <li className="flex items-center gap-2">
              <CheckIcon />
              Adequação LGPD com auditoria
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon />
              White label multi-unidade
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon />
              Fluxo até o financeiro integrado
            </li>
          </ul>
        </section>

        <section
          id="solucoes"
          className="relative z-10 scroll-mt-20 border-y border-slate-100 bg-white/70 py-20 backdrop-blur-sm sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                O que você ganha ao fechar com a gente
              </h2>
              <p className="mt-4 text-slate-600">
                Menos papel, menos retrabalho e mais pacientes bem atendidos — com dados organizados por clínica e por
                equipe.
              </p>
            </div>

            <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={CalendarDays}
                title="Agenda inteligente"
                description="Marcações com validação de conflitos, visão por profissional e controle centralizado das salas."
              />
              <FeatureCard
                icon={ClipboardList}
                title="Prontuário e atendimento"
                description="Evolução clínica com rastreabilidade e segurança, alinhado a boas práticas."
              />
              <FeatureCard
                icon={Wallet}
                title="Financeiro & cobranças"
                description="Acompanhe recebimentos, integração com gateways e menos inadimplência na operação."
              />
              <FeatureCard
                icon={Building2}
                title="Multiclínica"
                description="Várias unidades no mesmo sistema, cada uma com suas regras, equipe e faturamento."
              />
              <FeatureCard
                icon={PieChart}
                title="Gestão em tempo real"
                description="Métricas de faturamento, indicadores operacionais e visão rápida do que precisa atenção."
              />
              <FeatureCard
                icon={Shield}
                title="Papéis e permissões"
                description="RBAC por papel (admin, dono, médico, secretaria) para cada pessoa ver só o necessário."
              />
            </ul>
          </div>
        </section>

        <section id="diferenciais" className="relative z-10 scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Feito para vendas e operação cotidiana
                </h2>
                <p className="mt-4 text-lg text-slate-600">
                  Apresentação profissional para seu cliente final, ergonomia para o time que usa todos os dias.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Onboarding rápido e treino da equipe incluso nos planos comerciais",
                    "Interface moderna pensada para clínicas e consultórios de todos os portes",
                    "Especialistas em SaaS empresarial: evolução contínua e estabilidade",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-slate-700">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-teal-50/60 p-8 shadow-lg sm:p-10">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-sky-200/40 blur-2xl" aria-hidden />
                <MessageCircle className="relative h-10 w-10 text-sky-600" aria-hidden />
                <blockquote className="relative mt-6 text-xl font-medium leading-relaxed text-slate-800 sm:text-2xl">
                  &ldquo;A impressão digital do seu sistema passa segurança e organização desde o primeiro acesso.&rdquo;
                </blockquote>
                <p className="relative mt-6 text-sm font-medium uppercase tracking-wide text-sky-700/90">
                  Você fecha mais contratos quando a tecnologia conta a sua história
                </p>
              </div>
            </div>
          </div>
        </section>

        <ContactSection />

        <section className="relative z-10 border-t border-slate-200 bg-gradient-to-b from-sky-50/80 to-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Pronto para modernizar sua clínica?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-600">
              Entre na plataforma ou fale com a nossa equipe para um plano sob medida.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-700"
            >
              Ir para o login
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
        <p>
          <span className="font-medium text-slate-700">Facilita Clin</span> — plataforma de gestão para clínicas.
        </p>
        <p className="mt-2">
          <a href={`mailto:${CONTACT_MAIL}`} className="text-sky-600 hover:text-sky-700 hover:underline">
            {CONTACT_MAIL}
          </a>
        </p>
      </footer>
    </div>
  )
}

function CheckIcon() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-600">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="text-current">
        <path
          d="M10 3.5 4.5 9 2 6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </li>
  )
}

function ContactSection() {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [clinica, setClinica] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!nome.trim() || !email.trim() || !mensagem.trim()) {
        toast.error("Preencha nome, e-mail e mensagem.")
        return
      }
      setEnviando(true)
      try {
        const res = await fetch("/api/contato", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, clinica, mensagem }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          toast.error(data.error ?? "Não foi possível enviar. Tente de novo em instantes.")
          return
        }
        toast.success("Mensagem enviada! Retornaremos em breve.")
        setNome("")
        setEmail("")
        setClinica("")
        setMensagem("")
      } catch {
        toast.error("Erro de conexão. Verifique sua rede e tente novamente.")
      } finally {
        setEnviando(false)
      }
    },
    [clinica, email, mensagem, nome],
  )

  const mail = CONTACT_MAIL

  return (
    <section
      id="contato"
      className="relative z-10 scroll-mt-20 border-t border-slate-100 bg-slate-50/80 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Entre em contato</h2>
            <p className="mt-4 text-slate-600">
              Solicite uma demonstração, tire dúvidas comerciais ou peça uma proposta. Respondemos rapidamente para não
              deixar seu projeto esperando.
            </p>
            <div className="mt-8 space-y-4 text-sm">
              <a
                href={`mailto:${mail}`}
                className="block rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
              >
                {mail}
              </a>
              <p className="text-slate-500">
                O formulário ao lado envia a mensagem para nossa caixa configurada (<span className="text-slate-600">{mail}</span>).
                Você também pode clicar no e-mail acima para usar o seu cliente de correio.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md sm:p-8 lg:col-span-3"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nome completo *
                </span>
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail *</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="voce@sua-clinica.com"
                  autoComplete="email"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Clínica ou empresa
                </span>
                <input
                  value={clinica}
                  onChange={(e) => setClinica(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Nome fantasia"
                  autoComplete="organization"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mensagem *
                </span>
                <textarea
                  required
                  rows={4}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Quantos profissionais, unidades ou o que você precisa saber antes de comprar..."
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={enviando}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-600 hover:to-teal-600 disabled:pointer-events-none disabled:opacity-60 sm:w-auto sm:px-10"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Enviando…
                </>
              ) : (
                "Enviar mensagem"
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
