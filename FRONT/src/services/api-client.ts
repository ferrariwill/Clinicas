import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import { ErrorResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor - add JWT token and clinic context
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = Cookies.get("auth_token");
        const clinicId = Cookies.get("clinic_id");

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (clinicId) {
          config.headers["x-clinic-id"] = clinicId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        const status = error.response?.status;
        const errorData = error.response?.data;

        // Handle 401 - Unauthorized
        if (status === 401) {
          Cookies.remove("auth_token");
          Cookies.remove("user_info");
          window.location.href = "/login";
        }

        return Promise.reject({
          status,
          message: errorData?.mensagem || error.message,
          details: errorData?.detalhes,
        });
      }
    );
  }

  // Auth endpoints
  async login(email: string, senha: string) {
    const response = await this.axiosInstance.post("/login", {
      email,
      senha,
    });
    return response.data;
  }

  async alterarSenha(senhaAtual: string, novaSenha: string) {
    const response = await this.axiosInstance.put("/auth/alterar-senha", {
      senha_atual: senhaAtual,
      senha: novaSenha,
    });
    return response.data;
  }

  async esqueciSenha(email: string) {
    const response = await this.axiosInstance.post("/auth/esqueci-senha", {
      email,
    });
    return response.data;
  }

  async redefinirSenha(token: string, novaSenha: string) {
    const response = await this.axiosInstance.post("/auth/redefinir-senha", {
      token,
      nova_senha: novaSenha,
    });
    return response.data;
  }

  // Clinics endpoints
  async getClinicas() {
    const response = await this.axiosInstance.get("/clinicas");
    return response.data;
  }

  async criarClinica(data: any) {
    const response = await this.axiosInstance.post("/clinicas", data);
    return response.data;
  }

  async getConfiguracoes(clinicaId: string) {
    const response = await this.axiosInstance.get(
      `/clinicas/${clinicaId}/configuracoes`
    );
    return response.data;
  }

  async atualizarConfiguracoes(clinicaId: string, data: any) {
    const response = await this.axiosInstance.put(
      `/clinicas/${clinicaId}/configuracoes`,
      data
    );
    return response.data;
  }

  // Patients endpoints
  async getPacientes() {
    const response = await this.axiosInstance.get("/pacientes");
    return response.data;
  }

  async criarPaciente(data: any) {
    const response = await this.axiosInstance.post("/pacientes", data);
    return response.data;
  }

  async getPacientePorCPF(cpf: string) {
    const response = await this.axiosInstance.get(`/pacientes/${cpf}`);
    return response.data;
  }

  // Schedule endpoints
  async getAgendas() {
    const response = await this.axiosInstance.get("/clinicas/agenda");
    return response.data;
  }

  async criarAgenda(data: any) {
    const response = await this.axiosInstance.post("/clinicas/agenda", data);
    return response.data;
  }

  async getHorariosDisponiveis(
    usuarioId: string,
    procedimentoId: string,
    data: string
  ) {
    const response = await this.axiosInstance.get(
      "/clinicas/agenda/horarios-disponiveis",
      {
        params: {
          usuario_id: usuarioId,
          procedimento_id: procedimentoId,
          data,
        },
      }
    );
    return response.data;
  }

  async getAgendamentosDia(data: string, usuarioId?: string) {
    const params: Record<string, string> = { data }
    if (usuarioId) {
      params.usuario_id = usuarioId
    }

    const response = await this.axiosInstance.get("/clinicas/agenda", {
      params,
    })

    return response.data.agendamentos ?? response.data
  }

  async atualizarStatusAgenda(agendaId: string, statusId: string) {
    const response = await this.axiosInstance.put(
      `/clinicas/agenda/${agendaId}/status`,
      {
        status_id: statusId,
      }
    );
    return response.data;
  }

  // Medical records endpoints
  async getProntuarios() {
    const response = await this.axiosInstance.get("/clinicas/prontuarios");
    return response.data;
  }

  async criarProntuario(data: any) {
    const response = await this.axiosInstance.post(
      "/clinicas/prontuarios",
      data
    );
    return response.data;
  }

  async atualizarProntuario(prontuarioId: string, data: any) {
    const response = await this.axiosInstance.put(
      `/clinicas/prontuarios/${prontuarioId}`,
      data
    );
    return response.data;
  }

  // Procedures endpoints
  async getProcedimentos() {
    const response = await this.axiosInstance.get("/procedimentos");
    return response.data;
  }

  async criarProcedimento(data: any) {
    const response = await this.axiosInstance.post("/procedimentos", data);
    return response.data;
  }

  // Users endpoints
  async getUsuarios() {
    const response = await this.axiosInstance.get("/usuarios");
    return response.data;
  }

  async criarUsuario(data: any) {
    const response = await this.axiosInstance.post("/usuarios", data);
    return response.data;
  }

  async atualizarUsuario(usuarioId: string, data: any) {
    const response = await this.axiosInstance.put(`/usuarios/${usuarioId}`, data);
    return response.data;
  }

  async deletarUsuario(usuarioId: string) {
    const response = await this.axiosInstance.delete(`/usuarios/${usuarioId}`);
    return response.data;
  }

  async getHorariosUsuario(usuarioId: string) {
    const response = await this.axiosInstance.get(`/usuarios/${usuarioId}/horarios`);
    return response.data;
  }

  async definirHorariosUsuario(usuarioId: string, data: any) {
    const response = await this.axiosInstance.put(
      `/usuarios/${usuarioId}/horarios`,
      data
    );
    return response.data;
  }

  // Dashboard endpoints
  async getDashboard() {
    const response = await this.axiosInstance.get("/dashboard");
    return response.data;
  }

  async getAgendamentosHoje() {
    const response = await this.axiosInstance.get(
      "/dashboard/agendamentos-hoje"
    );
    return response.data;
  }

  async getEstatisticas() {
    const response = await this.axiosInstance.get("/dashboard/estatisticas");
    return response.data;
  }

  async getMetricasOperacionais(clinicId?: string) {
    const config = clinicId
      ? {
          headers: {
            "x-clinic-id": clinicId,
          },
        }
      : undefined;

    const response = await this.axiosInstance.get(
      "/dashboard/metricas-operacionais",
      config
    );
    return response.data;
  }

  // Financial endpoints
  async abrirFinanceiro() {
    const response = await this.axiosInstance.get("/financeiro/abrir");
    return response.data;
  }

  async getLancamentosFinanceiros(filtros?: any) {
    const response = await this.axiosInstance.get("/clinicas/financeiro", {
      params: filtros,
    });
    return response.data;
  }

  async criarLancamentoFinanceiro(data: any) {
    const response = await this.axiosInstance.post("/clinicas/financeiro", data);
    return response.data;
  }

  async getResumoFinanceiro(dataInicio?: string, dataFim?: string) {
    const params: any = {};
    if (dataInicio) params.data_inicio = dataInicio;
    if (dataFim) params.data_fim = dataFim;

    const response = await this.axiosInstance.get("/clinicas/financeiro/resumo", {
      params,
    });
    return response.data;
  }

  // Raw axios instance for custom requests
  getAxiosInstance() {
    return this.axiosInstance;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
