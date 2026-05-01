import type { Metadata } from "next"
import { MarketingLanding } from "@/components/marketing-landing"

export const metadata: Metadata = {
  title: "Facilita Clin — Gestão completa para clínicas",
  description:
    "Agenda, prontuário, financeiro e cobrança em uma plataforma multi-clínica. Demonstração comercial e acesso ao sistema.",
  openGraph: {
    title: "Facilita Clin",
    description: "Software de gestão para clínicas e consultórios. Peça uma demonstração ou acesse o sistema.",
  },
}

export default function HomePage() {
  return <MarketingLanding />
}
