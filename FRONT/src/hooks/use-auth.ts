import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/services/api-client";
import type { UsuarioInfo } from "@/types/api";
import { toast } from "sonner";

function mapUsuarioInfoFromAuthPayload(
  raw: Record<string, unknown>,
  obrigarTroca: boolean
): UsuarioInfo {
  const cid = raw.clinica_id ?? raw.ClinicaID;
  return {
    id: String(raw.id ?? raw.ID ?? ""),
    nome: String(raw.nome ?? raw.Nome ?? ""),
    email: String(raw.email ?? raw.Email ?? ""),
    tipo_usuario: String(raw.papel ?? raw.Papel ?? raw.tipo_usuario ?? ""),
    clinic_id: cid == null || cid === undefined ? "" : String(cid),
    ativo: Boolean(raw.ativo ?? raw.Ativo ?? true),
    obrigar_troca_senha: obrigarTroca,
  };
}

export const useAuth = () => {
  const {
    usuario,
    token,
    isAuthenticated,
    clinicaId,
    userRole,
    setUsuario,
    patchUsuario,
    setClinicaId,
    loadFromCookies,
    logout,
  } = useAuthStore();

  // Load auth state from cookies on mount
  useEffect(() => {
    loadFromCookies();
  }, [loadFromCookies]);

  const login = async (email: string, senha: string) => {
    try {
      const response = (await apiClient.login(email, senha)) as {
        token: string
        usuario: Record<string, unknown>
        obrigar_troca_senha?: boolean
      }
      const raw = (response.usuario ?? {}) as Record<string, unknown>
      const obrigar = Boolean(
        response.obrigar_troca_senha ?? raw.obrigar_troca_senha ?? raw.ObrigarTrocaSenha
      )
      const usuario = mapUsuarioInfoFromAuthPayload(raw, obrigar)
      setUsuario(usuario, response.token)
      return { success: true, data: { ...response, usuario } }
    } catch (error: unknown) {
      const err = error as { message?: string }
      const errorMessage =
        err.message || "Erro ao fazer login. Tente novamente."
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const handleLogout = () => {
    logout();
    toast.success("Desconectado com sucesso");
  };

  const changeClinica = (newClinicaId: string) => {
    setClinicaId(newClinicaId);
    toast.success("Clínica alterada com sucesso");
  };

  const trocarClinicaAtiva = async (novaClinicaId: string) => {
    try {
      const response = (await apiClient.trocarClinicaAtiva(Number(novaClinicaId))) as {
        token: string
        usuario: Record<string, unknown>
        obrigar_troca_senha?: boolean
      }
      const raw = (response.usuario ?? {}) as Record<string, unknown>
      const obrigar = Boolean(
        response.obrigar_troca_senha ?? raw.obrigar_troca_senha ?? raw.ObrigarTrocaSenha
      )
      const next = mapUsuarioInfoFromAuthPayload(raw, obrigar)
      setUsuario(next, response.token)
      toast.success("Clínica alterada com sucesso")
      return { success: true as const }
    } catch (error: unknown) {
      const err = error as { message?: string }
      const errorMessage =
        err.message || "Não foi possível trocar de clínica."
      toast.error(errorMessage)
      return { success: false as const, error: errorMessage }
    }
  }

  const hasPermission = (requiredRoles: string[]) => {
    if (!userRole) return false;
    // API usa papel "DONO"; documentação antiga do front usava "DONO_CLINICA".
    if (requiredRoles.includes("DONO_CLINICA") && userRole === "DONO") return true;
    return requiredRoles.includes(userRole);
  };

  return {
    usuario,
    token,
    isAuthenticated,
    clinicaId,
    userRole,
    login,
    logout: handleLogout,
    changeClinica,
    trocarClinicaAtiva,
    hasPermission,
    patchUsuario,
  };
};
