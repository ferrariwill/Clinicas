import { create } from "zustand";
import { UsuarioInfo, TipoUsuario } from "@/types/api";
import Cookies from "js-cookie";

interface AuthState {
  usuario: UsuarioInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  clinicaId: string | null;
  userRole: TipoUsuario | null;

  // Actions
  setUsuario: (usuario: UsuarioInfo, token: string) => void;
  clearAuth: () => void;
  setClinicaId: (clinicaId: string) => void;
  loadFromCookies: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  token: null,
  isAuthenticated: false,
  clinicaId: null,
  userRole: null,

  setUsuario: (usuario: UsuarioInfo, token: string) => {
    Cookies.set("auth_token", token, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    Cookies.set("user_info", JSON.stringify(usuario), {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    Cookies.set("clinic_id", usuario.clinic_id, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    set({
      usuario,
      token,
      isAuthenticated: true,
      clinicaId: usuario.clinic_id,
      userRole: usuario.tipo_usuario as TipoUsuario,
    });
  },

  clearAuth: () => {
    Cookies.remove("auth_token");
    Cookies.remove("user_info");
    Cookies.remove("clinic_id");

    set({
      usuario: null,
      token: null,
      isAuthenticated: false,
      clinicaId: null,
      userRole: null,
    });
  },

  setClinicaId: (clinicaId: string) => {
    Cookies.set("clinic_id", clinicaId, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    set({ clinicaId });
  },

  loadFromCookies: () => {
    const token = Cookies.get("auth_token");
    const userInfoStr = Cookies.get("user_info");
    const clinicaId = Cookies.get("clinic_id");

    if (token && userInfoStr) {
      try {
        const usuario = JSON.parse(userInfoStr) as UsuarioInfo;
        set({
          usuario,
          token,
          isAuthenticated: true,
          clinicaId: clinicaId || usuario.clinic_id,
          userRole: usuario.tipo_usuario as TipoUsuario,
        });
      } catch (error) {
        console.error("Failed to parse user info from cookies", error);
      }
    }
  },

  logout: () => {
    Cookies.remove("auth_token");
    Cookies.remove("user_info");
    Cookies.remove("clinic_id");

    set({
      usuario: null,
      token: null,
      isAuthenticated: false,
      clinicaId: null,
      userRole: null,
    });
  },
}));
