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
      const response = await apiClient.login(email, senha);
      setUsuario(response.usuario, response.access_token);
      return { success: true, data: response };
    } catch (error: unknown) {
      const err = error as { message?: string }
      const errorMessage =
        err.message || "Erro ao fazer login. Tente novamente.";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

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
