// Auth Types
export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  usuario: UsuarioInfo;
}

export interface UsuarioInfo {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string; // ADM_GERAL, DONO, MEDICO, SECRETARIA
  clinic_id: string;
  ativo: boolean;
}

export interface AlterarSenhaRequest {
  senha_atual: string;
  senha: string;
}

export interface EsqueciSenhaRequest {
  email: string;
}

export interface RedefinirSenhaRequest {
  token: string;
  nova_senha: string;
}

// Clinic Types
export interface ClinicaRequest {
  nome: string;
  email: string;
  telefone: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface ClinicaResponse {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ConfiguracaoRequest {
  [key: string]: any;
}

export interface ConfiguracaoResponse {
  [key: string]: any;
}

// Patient Types
export interface PacienteRequest {
  nome: string;
  cpf: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

export interface PacienteResponse {
  id: string;
  nome: string;
  cpf: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  clinic_id: string;
  criado_em: string;
}

// Schedule Types
export interface AgendaRequest {
  paciente_id: string;
  procedimento_id: string;
  data_horario: string;
  usuario_id: string;
}

export interface AgendaResponse {
  id: string;
  paciente_id: string;
  procedimento_id: string;
  data_horario: string;
  usuario_id: string;
  status: string;
  conflito?: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface HorarioDisponivel {
  data: string;
  horarios: string[];
}

export interface AtualizarStatusRequest {
  status_id: string;
}

export interface AgendamentoResumo {
  id: string;
  paciente_nome: string;
  procedimento_nome: string;
  data_horario: string;
  status: string;
}

export interface AgendamentoHojeResponse {
  total: number;
  agendamentos: AgendamentoResumo[];
}

// Medical Record Types
export interface CriarProntuarioRequest {
  paciente_id: string;
  titulo: string;
  descricao?: string;
  data_consulta?: string;
  usuario_id: string;
}

export interface AtualizarProntuarioRequest {
  titulo: string;
  descricao?: string;
}

export interface ProntuarioRegistroSwagger {
  id: string;
  paciente_id: string;
  titulo: string;
  descricao?: string;
  usuario_id: string;
  data_consulta?: string;
  criado_em: string;
  atualizado_em: string;
  editavel: boolean; // false se > 24h
}

// Procedure Types
export interface ProcedimentoRequest {
  nome: string;
  descricao?: string;
  duracao_minutos: number;
  valor: number;
}

export interface ProcedimentoResponse {
  id: string;
  nome: string;
  descricao?: string;
  duracao_minutos: number;
  valor: number;
  clinic_id: string;
  criado_em: string;
}

export interface ProcedimentoPopular {
  id: string;
  nome: string;
  frequencia: number;
}

// User Types
export interface UsuarioRequest {
  nome: string;
  email: string;
  tipo_usuario: string;
  telefone?: string;
}

export interface UsuarioResponse {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
  telefone?: string;
  clinic_id: string;
  ativo: boolean;
  criado_em: string;
}

export interface UsuarioHorarioRequest {
  dias_semana: number[]; // 0-6
  horario_inicio: string; // HH:mm
  horario_fim: string; // HH:mm
}

export interface UsuarioHorarioResponse {
  id: string;
  usuario_id: string;
  dias_semana: number[];
  horario_inicio: string;
  horario_fim: string;
}

// Dashboard Types
export interface DashboardResponse {
  faturamento_total: number;
  faturamento_mes: number;
  no_show_taxa: number;
  agendamentos_proximos: AgendamentoResumo[];
  estatisticas_mes: EstatisticaMensal[];
}

export interface EstatisticaMensal {
  mes: string;
  agendamentos: number;
  faturamento: number;
  no_show: number;
}

export interface EstatisticasResponse {
  periodo: string;
  dados: EstatisticaMensal[];
}

export interface MetricasOperacionaisSwagger {
  faturamento_mensal: number;
  no_show_taxa: number;
  total_atendimentos: number;
  tempo_medio_consulta: number;
  lotacao_media: number;
  taxa_conversao: number;
  satisfacao_media: number;
}

// Insurance Types
export interface ConvenioRequest {
  nome: string;
  cnpj?: string;
  desconto_percentual?: number;
}

export interface ConvenioResponse {
  id: string;
  nome: string;
  cnpj?: string;
  desconto_percentual?: number;
  clinic_id: string;
  ativo: boolean;
  criado_em: string;
}

// Permission Types
export type TipoUsuario = "ADM_GERAL" | "DONO" | "MEDICO" | "SECRETARIA";

export interface RolePermission {
  tipo_usuario: TipoUsuario;
  telas_permitidas: string[];
}

// API Error Response
export interface ErrorResponse {
  status: number;
  mensagem: string;
  erro?: string;
  detalhes?: any;
}

export interface MessageResponse {
  mensagem: string;
}

// Token Payload (JWT decoded)
export interface TokenPayload {
  sub: string; // user_id
  email: string;
  tipo_usuario: TipoUsuario;
  clinic_id: string;
  iat: number;
  exp: number;
}

// Financial Types
export interface LancamentoFinanceiro {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA';
  categoria: 'PARTICULAR' | 'CONVENIO';
  usuario_id?: string;
  agenda_id?: string;
  criado_em: string;
}

export interface ResumoFinanceiro {
  totalEntradas: number;
  totalSaidas: number;
  saldoLiquido: number;
}

export interface CriarLancamentoRequest {
  descricao: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA';
  categoria: 'PARTICULAR' | 'CONVENIO';
  data?: string;
}

export interface FiltrosFinanceiro {
  dataInicio?: string;
  dataFim?: string;
  categoria?: 'PARTICULAR' | 'CONVENIO';
}
