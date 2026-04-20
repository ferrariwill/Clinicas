import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import { ErrorResponse, ClinicaRequest, PacienteRequest, AgendaRequest, CriarProntuarioRequest, AtualizarProntuarioRequest, ProcedimentoRequest, ConvenioRequest, UsuarioRequest, DefinirHorariosUsuarioRequest, CriarLancamentoRequest, FiltrosFinanceiro, MinhaClinicaAuth } from "@/types/api";

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

        // Sem resposta HTTP = rede / CORS / backend parado (o browser muitas vezes mostra só "Network Error").
        if (error.response === undefined) {
          const base = error.config?.baseURL ?? API_BASE_URL;
          const hint =
            `Não foi possível contatar a API em ${base}. ` +
            `Suba o backend (API na porta 8080 por padrão), confira NEXT_PUBLIC_API_URL no arquivo FRONT/.env.local ` +
            `e use o mesmo host que você abre no navegador (localhost vs 127.0.0.1).`;
          return Promise.reject({
            status: 0,
            message: hint,
            details: error.message,
          });
        }

        // 401: sessão inválida (exceto troca de senha com credencial errada — a API usa 400 nesse caso).
        if (status === 401) {
          const url = error.config?.url ?? "";
          if (!url.includes("/auth/alterar-senha")) {
            Cookies.remove("auth_token");
            Cookies.remove("user_info");
            window.location.href = "/login";
          }
        }

        const apiMsg =
          errorData?.mensagem ||
          errorData?.erro ||
          errorData?.error ||
          error.message;

        return Promise.reject({
          status,
          message: apiMsg,
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
      senha: senhaAtual,
      nova_senha: novaSenha,
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

  /** Rotas de API permitidas ao tipo do usuário (menu + checagens leves no front). */
  async getMinhasPermissoesRotas(): Promise<{ rotas: string[]; acesso_total: boolean }> {
    const response = await this.axiosInstance.get("/auth/minhas-permissoes-rotas");
    const data = response.data as { rotas?: string[]; acesso_total?: boolean };
    return {
      rotas: Array.isArray(data.rotas) ? data.rotas : [],
      acesso_total: Boolean(data.acesso_total),
    };
  }

  async getMinhasClinicas(): Promise<{ clinicas: MinhaClinicaAuth[] }> {
    const response = await this.axiosInstance.get("/auth/minhas-clinicas");
    const data = response.data as { clinicas?: MinhaClinicaAuth[] };
    return { clinicas: Array.isArray(data.clinicas) ? data.clinicas : [] };
  }

  async trocarClinicaAtiva(clinicaId: number) {
    const response = await this.axiosInstance.post("/auth/trocar-clinica", {
      clinica_id: clinicaId,
    });
    return response.data;
  }

  // Clinics endpoints
  async getClinicas() {
    const response = await this.axiosInstance.get("/clinicas");
    return response.data;
  }

  async criarClinica(data: ClinicaRequest) {
    const response = await this.axiosInstance.post("/clinicas", data);
    return response.data;
  }

  async getConfiguracoes(clinicaId: string) {
    const response = await this.axiosInstance.get(
      `/clinicas/${clinicaId}/configuracoes`
    );
    return response.data;
  }

  async atualizarConfiguracoes(clinicaId: string, data: Record<string, string | number | boolean | null | undefined>) {
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

  async criarPaciente(data: PacienteRequest) {
    const body = {
      nome: data.nome,
      cpf: data.cpf,
      data_nasc: data.data_nascimento ?? "",
      telefone: data.telefone ?? "",
      email: data.email ?? "",
    }
    const response = await this.axiosInstance.post("/pacientes", body);
    return response.data;
  }

  async getPacientePorCPF(cpf: string) {
    const response = await this.axiosInstance.get(`/pacientes/${cpf}`);
    return response.data;
  }

  async atualizarPaciente(
    id: string,
    data: {
      nome: string;
      cpf: string;
      data_nascimento?: string;
      telefone?: string;
      email?: string;
    }
  ) {
    const response = await this.axiosInstance.put(`/pacientes/${id}`, {
      nome: data.nome,
      cpf: data.cpf,
      data_nascimento: data.data_nascimento ?? "",
      telefone: data.telefone ?? "",
      email: data.email ?? "",
    });
    return response.data;
  }

  // Schedule endpoints
  async getAgendas() {
    const response = await this.axiosInstance.get("/clinicas/agenda");
    return response.data;
  }

  async criarAgenda(data: AgendaRequest) {
    const fromMulti = (data.procedimento_ids ?? [])
      .map((x) => Number(String(x).trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
    const single = data.procedimento_id?.trim() ? Number(String(data.procedimento_id).trim()) : NaN
    let ordered: number[] = []
    if (Number.isFinite(single) && single > 0) {
      ordered = [single, ...fromMulti.filter((x) => x !== single)]
    } else {
      ordered = [...fromMulti]
    }
    const seen = new Set<number>()
    const unique = ordered.filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
    if (unique.length === 0) {
      throw new Error("Selecione ao menos um procedimento")
    }
    const pid = Number.parseInt(String(data.paciente_id ?? "").trim(), 10)
    const uid = Number.parseInt(String(data.usuario_id ?? "").trim(), 10)
    if (!Number.isFinite(pid) || pid <= 0) {
      throw new Error("Selecione um paciente válido (id ausente ou inválido).")
    }
    if (!Number.isFinite(uid) || uid <= 0) {
      throw new Error("Selecione um profissional válido.")
    }
    const body: Record<string, unknown> = {
      paciente_id: pid,
      usuario_id: uid,
      data_hora: data.data_horario,
    }
    if (unique.length > 1) {
      body.procedimento_id = unique[0]
      body.procedimento_ids = unique
    } else {
      body.procedimento_id = unique[0]
    }
    const response = await this.axiosInstance.post("/clinicas/agenda", body);
    return response.data;
  }

  async getHorariosDisponiveis(
    usuarioId: string,
    procedimentoId: string,
    data: string,
    duracaoTotalMin?: number
  ) {
    const params: Record<string, string> = {
      usuario_id: usuarioId,
      procedimento_id: procedimentoId,
      data,
    };
    if (duracaoTotalMin != null && duracaoTotalMin > 0) {
      params.duracao_total = String(Math.round(duracaoTotalMin));
    }
    const response = await this.axiosInstance.get(
      "/clinicas/agenda/horarios-disponiveis",
      { params }
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
    const body = /^\d+$/.test(statusId.trim())
      ? { status_id: Number(statusId) }
      : { status: statusId }
    const response = await this.axiosInstance.put(`/clinicas/agenda/${agendaId}/status`, body);
    return response.data;
  }

  // Medical records endpoints
  async getProntuarios(pacienteId: string) {
    const response = await this.axiosInstance.get("/clinicas/prontuarios", {
      params: { paciente_id: pacienteId },
    })
    return response.data
  }

  async criarProntuario(data: CriarProntuarioRequest) {
    const pid = Number.parseInt(String(data.paciente_id ?? "").trim(), 10)
    if (!Number.isFinite(pid) || pid <= 0) {
      throw new Error("Paciente inválido para o prontuário.")
    }
    const conteudo = (data.conteudo ?? data.descricao ?? "").trim()
    const body = {
      paciente_id: pid,
      titulo: data.titulo.trim(),
      conteudo,
    }
    const response = await this.axiosInstance.post("/clinicas/prontuarios", body)
    return response.data
  }

  async atualizarProntuario(prontuarioId: string, data: AtualizarProntuarioRequest) {
    const body = {
      titulo: data.titulo.trim(),
      conteudo: (data.conteudo ?? data.descricao ?? "").trim(),
    }
    const response = await this.axiosInstance.put(`/clinicas/prontuarios/${prontuarioId}`, body)
    return response.data
  }

  // Procedures endpoints
  async getProcedimentos(ativas?: boolean) {
    const response = await this.axiosInstance.get("/procedimentos", {
      params: ativas === undefined ? undefined : { ativas: String(ativas) },
    });
    return response.data;
  }

  async criarProcedimento(data: ProcedimentoRequest, opts?: { convenio_id?: number; ativo?: boolean }) {
    const body = {
      nome: data.nome,
      descricao: data.descricao ?? "",
      preco: data.valor,
      duracao_min: data.duracao_minutos,
      convenio_id: opts?.convenio_id ?? 0,
      ativo: opts?.ativo !== false,
    }
    const response = await this.axiosInstance.post("/procedimentos", body);
    return response.data;
  }

  async atualizarProcedimento(
    id: string,
    data: ProcedimentoRequest,
    opts?: { convenio_id?: number; ativo?: boolean }
  ) {
    const body = {
      nome: data.nome,
      descricao: data.descricao ?? "",
      preco: data.valor,
      duracao_min: data.duracao_minutos,
      convenio_id: opts?.convenio_id ?? 0,
      ativo: opts?.ativo !== false,
    }
    const response = await this.axiosInstance.put(`/procedimentos/${id}`, body);
    return response.data;
  }

  async desativarProcedimento(id: string) {
    const response = await this.axiosInstance.delete(`/procedimentos/${id}`);
    return response.data;
  }

  async reativarProcedimento(id: string) {
    const response = await this.axiosInstance.put(`/procedimentos/${id}/reativar`);
    return response.data;
  }

  // Convênios
  async getConvenios(ativos?: boolean) {
    const response = await this.axiosInstance.get("/convenios", {
      params: ativos === undefined ? undefined : { ativos: String(ativos) },
    });
    return response.data;
  }

  async criarConvenio(data: ConvenioRequest) {
    const response = await this.axiosInstance.post("/convenios", data);
    return response.data;
  }

  async atualizarConvenio(id: string, data: ConvenioRequest) {
    const response = await this.axiosInstance.put(`/convenios/${id}`, data);
    return response.data;
  }

  async desativarConvenio(id: string) {
    const response = await this.axiosInstance.delete(`/convenios/${id}`);
    return response.data;
  }

  async reativarConvenio(id: string) {
    const response = await this.axiosInstance.put(`/convenios/${id}/reativar`);
    return response.data;
  }

  // Users endpoints
  async getUsuarios() {
    const response = await this.axiosInstance.get("/usuarios");
    return response.data;
  }

  /** Tipos de usuário da clínica do token (Médico, Secretária, etc.) */
  async getTiposUsuarioClinica() {
    const response = await this.axiosInstance.get("/clinicas/tipos-usuario");
    return Array.isArray(response.data) ? response.data : [];
  }

  /** Catálogo de telas (gestão dono / ADM_GERAL) */
  async getGestaoTelas() {
    const response = await this.axiosInstance.get("/clinicas/gestao/telas");
    return Array.isArray(response.data) ? response.data : [];
  }

  async getGestaoTiposUsuario() {
    const response = await this.axiosInstance.get("/clinicas/gestao/tipos-usuario");
    return Array.isArray(response.data) ? response.data : [];
  }

  async criarGestaoTipoUsuario(data: { nome: string; descricao: string; papel: string }) {
    const response = await this.axiosInstance.post("/clinicas/gestao/tipos-usuario", data);
    return response.data;
  }

  async atualizarGestaoTipoUsuario(
    id: number,
    data: { nome?: string; descricao?: string; papel?: string }
  ) {
    const response = await this.axiosInstance.put(`/clinicas/gestao/tipos-usuario/${id}`, data);
    return response.data;
  }

  async desativarGestaoTipoUsuario(id: number) {
    const response = await this.axiosInstance.delete(`/clinicas/gestao/tipos-usuario/${id}`);
    return response.data;
  }

  async reativarGestaoTipoUsuario(id: number) {
    const response = await this.axiosInstance.put(`/clinicas/gestao/tipos-usuario/${id}/reativar`);
    return response.data;
  }

  async getGestaoPermissoesPorTipo(tipoUsuarioId: number) {
    const response = await this.axiosInstance.get(
      `/clinicas/gestao/permissoes-tela/tipo-usuario/${tipoUsuarioId}`
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  async associarGestaoPermissaoTela(tipo_usuario_id: number, tela_id: number) {
    const response = await this.axiosInstance.post("/clinicas/gestao/permissoes-tela", {
      tipo_usuario_id,
      tela_id,
    });
    return response.data;
  }

  async desassociarGestaoPermissaoTela(tipo_usuario_id: number, tela_id: number) {
    const response = await this.axiosInstance.delete(
      `/clinicas/gestao/permissoes-tela/${tipo_usuario_id}/${tela_id}`
    );
    return response.data;
  }

  /** Cria usuário na clínica do token (dono / admin da clínica) */
  async criarUsuarioClinica(data: {
    nome: string;
    email: string;
    senha?: string;
    tipo_usuario_id: number;
  }) {
    const body: Record<string, unknown> = {
      nome: data.nome,
      email: data.email,
      tipo_usuario_id: data.tipo_usuario_id,
    }
    if (data.senha && data.senha.trim().length > 0) {
      body.senha = data.senha
    }
    const response = await this.axiosInstance.post("/clinicas/usuarios", body);
    return response.data;
  }

  async criarUsuario(data: UsuarioRequest) {
    const response = await this.axiosInstance.post("/usuarios", data);
    return response.data;
  }

  async atualizarUsuario(
    usuarioId: string,
    data: {
      nome?: string;
      email?: string;
      senha?: string;
      tipo_usuario_id?: number;
      max_pacientes?: number;
      permite_simultaneo?: boolean;
    }
  ) {
    const response = await this.axiosInstance.put(`/usuarios/${usuarioId}`, data);
    return response.data;
  }

  async deletarUsuario(usuarioId: string) {
    const response = await this.axiosInstance.delete(`/usuarios/${usuarioId}`);
    return response.data;
  }

  async reativarUsuario(usuarioId: string) {
    const response = await this.axiosInstance.put(`/usuarios/${usuarioId}/reativar`, {});
    return response.data;
  }

  async getHorariosUsuario(usuarioId: string) {
    const response = await this.axiosInstance.get(`/usuarios/${usuarioId}/horarios`);
    return response.data;
  }

  async definirHorariosUsuario(usuarioId: string, data: DefinirHorariosUsuarioRequest) {
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

  async getLancamentosFinanceiros(filtros?: FiltrosFinanceiro) {
    const response = await this.axiosInstance.get("/clinicas/financeiro", {
      params: filtros,
    });
    return response.data;
  }

  async criarLancamentoFinanceiro(data: CriarLancamentoRequest) {
    const response = await this.axiosInstance.post("/clinicas/financeiro", data);
    return response.data;
  }

  async getResumoFinanceiro(dataInicio?: string, dataFim?: string) {
    const params: Record<string, string> = {};
    if (dataInicio) params.data_inicio = dataInicio;
    if (dataFim) params.data_fim = dataFim;

    const response = await this.axiosInstance.get("/clinicas/financeiro/resumo", {
      params,
    });
    return response.data;
  }

  async getCustosFixos(ativos?: boolean) {
    const params: Record<string, string> = {};
    if (ativos !== undefined) {
      params.ativos = ativos ? "true" : "false";
    }
    const response = await this.axiosInstance.get("/clinicas/custos-fixos", { params });
    return response.data;
  }

  async criarCustoFixo(data: { descricao: string; valor_mensal: number }) {
    const response = await this.axiosInstance.post("/clinicas/custos-fixos", data);
    return response.data;
  }

  async atualizarCustoFixo(
    id: string,
    data: { descricao: string; valor_mensal: number; ativo?: boolean }
  ) {
    const response = await this.axiosInstance.put(`/clinicas/custos-fixos/${id}`, data);
    return response.data;
  }

  // Raw axios instance for custom requests
  getAxiosInstance() {
    return this.axiosInstance;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
