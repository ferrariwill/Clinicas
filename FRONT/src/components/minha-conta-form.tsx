"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import { ArrowLeft, KeyRound, Loader2, User } from "lucide-react"

export type MinhaContaFormProps = {
  backHref: string
  backLabel: string
}

export function MinhaContaForm({ backHref, backLabel }: MinhaContaFormProps) {
  const { usuario, patchUsuario } = useAuth()
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [savingPerfil, setSavingPerfil] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmaSenha, setConfirmaSenha] = useState("")
  const [savingSenha, setSavingSenha] = useState(false)

  useEffect(() => {
    if (!usuario) return
    setNome(usuario.nome ?? "")
    setEmail(usuario.email ?? "")
  }, [usuario])

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario?.id) return
    const n = nome.trim()
    const em = email.trim()
    if (n.length < 2) {
      toast.error("Informe seu nome (mínimo 2 caracteres).")
      return
    }
    if (!em) {
      toast.error("Informe seu e-mail.")
      return
    }
    setSavingPerfil(true)
    try {
      await apiClient.atualizarUsuario(usuario.id, { nome: n, email: em })
      patchUsuario({ nome: n, email: em })
      toast.success("Seus dados foram atualizados.")
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || e.message || "Não foi possível salvar.")
    } finally {
      setSavingPerfil(false)
    }
  }

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }
    if (novaSenha !== confirmaSenha) {
      toast.error("A confirmação não coincide com a nova senha.")
      return
    }
    setSavingSenha(true)
    try {
      await apiClient.alterarSenha(senhaAtual, novaSenha)
      patchUsuario({ obrigar_troca_senha: false })
      setSenhaAtual("")
      setNovaSenha("")
      setConfirmaSenha("")
      toast.success("Senha alterada com sucesso.")
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { erro?: string; error?: string } } }
      const msg =
        e.response?.data?.error ||
        e.response?.data?.erro ||
        e.message ||
        "Não foi possível alterar a senha."
      toast.error(msg)
    } finally {
      setSavingSenha(false)
    }
  }

  if (!usuario) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Carregando…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className={cn(
            "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-gray-300 bg-transparent px-3 text-xs font-medium text-slate-900 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-700/70"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </div>

      <Card className="border-slate-200 dark:border-slate-600">
        <CardHeader>
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <User className="h-5 w-5" />
            <CardTitle>Meus dados</CardTitle>
          </div>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Nome e e-mail usados no login e na clínica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSalvarPerfil} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="perfil-nome">Nome</Label>
              <Input
                id="perfil-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                disabled={savingPerfil}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="perfil-email">E-mail</Label>
              <Input
                id="perfil-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={savingPerfil}
                required
              />
            </div>
            <Button type="submit" disabled={savingPerfil} className="w-full sm:w-auto">
              {savingPerfil ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar dados"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-600">
        <CardHeader>
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <KeyRound className="h-5 w-5" />
            <CardTitle>Alterar senha</CardTitle>
          </div>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Informe a senha atual e a nova senha. Se você acabou de usar uma senha provisória, use-a como senha atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAlterarSenha} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="perfil-senha-atual">Senha atual</Label>
              <Input
                id="perfil-senha-atual"
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                disabled={savingSenha}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="perfil-nova-senha">Nova senha</Label>
              <Input
                id="perfil-nova-senha"
                type="password"
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                disabled={savingSenha}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="perfil-confirma-senha">Confirmar nova senha</Label>
              <Input
                id="perfil-confirma-senha"
                type="password"
                autoComplete="new-password"
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                disabled={savingSenha}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={savingSenha} className="w-full sm:w-auto">
              {savingSenha ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando…
                </>
              ) : (
                "Alterar senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
