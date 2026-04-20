"use client"

import { useState } from "react"
import Link from "next/link"
import { apiClient } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Mail } from "lucide-react"

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("INFORME O E-MAIL.")
      return
    }
    setPending(true)
    try {
      await apiClient.esqueciSenha(email.trim())
      toast.success(
        "SE O E-MAIL ESTIVER CADASTRADO, VOCÊ RECEBERÁ UMA SENHA PROVISÓRIA. NO PRIMEIRO ACESSO SERÁ OBRIGATÓRIO TROCAR A SENHA."
      )
    } catch (err: unknown) {
      const er = err as { message?: string }
      toast.error((er.message || "NÃO FOI POSSÍVEL PROCESSAR O PEDIDO.").toUpperCase())
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-slate-700" />
              <CardTitle className="text-xl uppercase tracking-wide">Esqueci a senha</CardTitle>
            </div>
            <CardDescription className="uppercase text-xs leading-relaxed tracking-wide text-slate-600">
              ENVIAREMOS UMA SENHA PROVISÓRIA PARA O SEU E-MAIL (MESMO FLUXO DO PRIMEIRO ACESSO DA EQUIPE). CONFIGURE SMTP
              NO SERVIDOR PARA O ENVIO FUNCIONAR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-700">E-mail cadastrado</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  placeholder="nome@clinica.com"
                />
              </div>
              <Button type="submit" disabled={pending} className="w-full uppercase tracking-wide">
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  "Enviar senha provisória"
                )}
              </Button>
              <p className="text-center text-sm">
                <Link href="/login" className="font-medium uppercase tracking-wide text-blue-600 hover:text-blue-800">
                  Voltar ao login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
