"use client"

import { MinhaContaForm } from "@/components/minha-conta-form"

export default function PerfilPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Minha conta</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Atualize seus dados e sua senha de acesso.
        </p>
      </div>
      <MinhaContaForm backHref="/dashboard" backLabel="Voltar ao dashboard" />
    </div>
  )
}
