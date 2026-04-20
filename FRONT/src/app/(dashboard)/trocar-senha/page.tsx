"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { KeyRound, Loader2 } from "lucide-react"

export default function TrocarSenhaPage() {
  const router = useRouter()
  const { usuario, patchUsuario, userRole } = useAuth()
  const obrigar = Boolean(usuario?.obrigar_troca_senha)
  const [senhaAtual, setSenhaAtual] = useState("")
  const [nova, setNova] = useState("")
  const [confirma, setConfirma] = useState("")
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nova.length < 6) {
      toast.error("A NOVA SENHA DEVE TER NO MÍNIMO 6 CARACTERES.")
      return
    }
    if (nova !== confirma) {
      toast.error("A CONFIRMAÇÃO NÃO COINCIDE COM A NOVA SENHA.")
      return
    }
    setPending(true)
    try {
      await apiClient.alterarSenha(senhaAtual, nova)
      patchUsuario({ obrigar_troca_senha: false })
      toast.success("SENHA ALTERADA COM SUCESSO.")
      const dest = userRole === "ADM_GERAL" ? "/admin/dashboard" : "/dashboard"
      router.replace(dest)
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error((e.message || "ERRO AO ALTERAR SENHA.").toUpperCase())
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card className="border-slate-200 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-slate-900">
            <KeyRound className="h-6 w-6" />
            <CardTitle className="text-xl uppercase tracking-wide">
              {obrigar ? "Definir nova senha" : "Alterar senha"}
            </CardTitle>
          </div>
          <CardDescription className="uppercase text-xs tracking-wide text-slate-600">
            {obrigar
              ? "USE A SENHA PROVISÓRIA ENVIADA POR E-MAIL E ESCOLHA UMA NOVA SENHA PARA CONTINUAR."
              : "ATUALIZE SUA SENHA DE ACESSO."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Senha atual / provisória
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-700">Nova senha</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-700">Confirmar nova senha</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full uppercase tracking-wide">
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
