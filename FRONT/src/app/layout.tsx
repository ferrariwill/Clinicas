import type { Metadata, Viewport } from "next"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Facilita Clin — Sistema de gestão para clínicas",
  description: "Plataforma de agenda, prontuário, financeiro e multiclínica.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen antialiased bg-white text-gray-900 transition-colors duration-200">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
