import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/services/api-client";
import { toast } from "sonner";

export const useAuth = () => {
  const {
    usuario,
    token,
    isAuthenticated,
    clinicaId,
    userRole,
    setUsuario,
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
      const response = await apiClient.login(email, senha)
      // API retorna { token, usuario: { id, nome, email, tipo_usuario_id, clinica_id, papel } }
      const usuario = {
        ...response.usuario,
        clinic_id: String(response.usuario.clinica_id ?? ""),
        tipo_usuario: response.usuario.papel,
      }
      setUsuario(usuario, response.token)
      return { success: true, data: response }
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

  const hasPermission = (requiredRoles: string[]) => {
    if (!userRole) return false;
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
    hasPermission,
  };
};
