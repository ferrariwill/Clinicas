import { create } from "zustand";
import { UsuarioInfo, TipoUsuario } from "@/types/api";
import Cookies from "js-cookie";

const COOKIE_OPTIONS = {
  expires: 7,
  secure: false,
  sameSite: "lax" as const,
}

interface AuthState {
  usuario: UsuarioInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  clinicaId: string | null;
  userRole: TipoUsuario | null;

  setUsuario: (usuario: UsuarioInfo, token: string) => void;
  patchUsuario: (partial: Partial<UsuarioInfo>) => void;
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
    const u: UsuarioInfo = {
      ...usuario,
      obrigar_troca_senha: Boolean(usuario.obrigar_troca_senha),
    }
    Cookies.set("auth_token", token, COOKIE_OPTIONS)
    Cookies.set("user_info", JSON.stringify(u), COOKIE_OPTIONS)
    Cookies.set("clinic_id", u.clinic_id, COOKIE_OPTIONS)
    Cookies.set("user_role", u.tipo_usuario, COOKIE_OPTIONS)
    set({
      usuario: u,
      token,
      isAuthenticated: true,
      clinicaId: u.clinic_id,
      userRole: u.tipo_usuario as TipoUsuario,
    })
  },

  patchUsuario: (partial: Partial<UsuarioInfo>) => {
    set((state) => {
      if (!state.usuario) return state
      const next: UsuarioInfo = { ...state.usuario, ...partial }
      Cookies.set("user_info", JSON.stringify(next), COOKIE_OPTIONS)
      return {
        usuario: next,
        userRole: (next.tipo_usuario as TipoUsuario) ?? state.userRole,
      }
    })
  },

  clearAuth: () => {
    Cookies.remove("auth_token")
    Cookies.remove("user_info")
    Cookies.remove("clinic_id")
    Cookies.remove("user_role")
    set({
      usuario: null,
      token: null,
      isAuthenticated: false,
      clinicaId: null,
      userRole: null,
    })
  },

  setClinicaId: (clinicaId: string) => {
    Cookies.set("clinic_id", clinicaId, COOKIE_OPTIONS)
    set({ clinicaId })
  },

  loadFromCookies: () => {
    const token = Cookies.get("auth_token")
    const userInfoStr = Cookies.get("user_info")
    const clinicaId = Cookies.get("clinic_id")

    if (token && userInfoStr) {
      try {
        const usuario = JSON.parse(userInfoStr) as UsuarioInfo
        set({
          usuario,
          token,
          isAuthenticated: true,
          clinicaId: clinicaId || usuario.clinic_id,
          userRole: usuario.tipo_usuario as TipoUsuario,
        })
      } catch (error) {
        console.error("Failed to parse user info from cookies", error)
      }
    }
  },

  logout: () => {
    Cookies.remove("auth_token")
    Cookies.remove("user_info")
    Cookies.remove("clinic_id")
    Cookies.remove("user_role")
    set({
      usuario: null,
      token: null,
      isAuthenticated: false,
      clinicaId: null,
      userRole: null,
    })
  },
}))
