"use client"

import { useState } from "react"
import { Users, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminUsuarios, useAdminClinicas } from "@/hooks/use-admin"

const PAPEL_LABEL: Record<string, string> = { ADM_GERAL: "Admin Geral", DONO: "Dono", MEDICO: "Médico", SECRETARIA: "Secretária", Administrador: "Administrador" }
const PAPEL_COLOR: Record<string, string> = { ADM_GERAL: "bg-red-100 text-red-700", DONO: "bg-violet-100 text-violet-700", MEDICO: "bg-blue-100 text-blue-700", SECRETARIA: "bg-amber-100 text-amber-700", Administrador: "bg-slate-100 text-slate-700" }

export default function AdminUsuariosPage() {
  const [search, setSearch] = useState("")
  const { data: usuarios, isLoading } = useAdminUsuarios()
  const { data: clinicas } = useAdminClinicas()

  const filtered = usuarios?.filter((u) =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  ) ?? []
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, u) => {
    const key = String(u.clinica_id)
    if (!acc[key]) acc[key] = []
    acc[key].push(u)
    return acc
  }, {})
  const clinicIds = Object.keys(grouped).sort((a, b) => Number(a) - Number(b))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Usuários</h2>
          <p className="text-sm text-slate-500 mt-1">Todos os usuários cadastrados no sistema</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuário..." className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-full sm:w-56" />
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Total: {filtered.length} usuários</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-slate-400 py-8 text-center">Carregando...</p>}
          {!isLoading && !filtered.length && (
            <div className="py-12 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3" />
              <p className="font-medium">Nenhum usuário encontrado</p>
            </div>
          )}
          <div className="space-y-4">
            {clinicIds.map((cid) => {
              const users = grouped[cid] ?? []
              const clinica = clinicas?.find((c) => c.id === Number(cid))
              return (
                <div key={cid} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2">
                    <p className="font-semibold text-slate-900">{clinica?.nome ?? `Clínica #${cid}`}</p>
                    <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">
                      {users.length} ativo(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div key={u.id} className="rounded-lg border border-slate-100 p-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-violet-700">{u.nome.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{u.nome}</p>
                            <p className="text-sm text-slate-500 break-all">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${PAPEL_COLOR[u.tipo_usuario] ?? "bg-slate-100 text-slate-700"}`}>
                            {PAPEL_LABEL[u.tipo_usuario] ?? u.tipo_usuario}
                          </span>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            Ativo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
