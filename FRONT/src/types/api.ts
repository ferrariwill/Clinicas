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
  /** Primeiro acesso ou recuperação de senha: o sistema exige trocar a senha. */
  obrigar_troca_senha?: boolean;
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

/** Item de GET /auth/minhas-clinicas (contexto do usuário na clínica). */
export interface MinhaClinicaAuth {
  clinica_id: number;
  nome: string;
  email: string;
  tipo_usuario_id: number;
  papel: string;
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
  [key: string]: string | number | boolean | null | undefined;
}

export interface ConfiguracaoResponse {
  [key: string]: string | number | boolean | null | undefined;
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
  /** Primeiro procedimento (legado); se `procedimento_ids` tiver vários, o primeiro é o principal. */
  procedimento_id?: string;
  /** Ordem dos procedimentos selecionados (múltiplos no mesmo horário). */
  procedimento_ids?: string[];
  data_horario: string;
  usuario_id: string;
}

export interface AgendaResponse {
  id: string;
  paciente_id: string;
  paciente_nome?: string;
  procedimento_id: string;
  procedimento_nome?: string;
  /** Todos os procedimentos do agendamento (principal + extras). */
  procedimento_ids?: string[];
  procedimento_nomes?: string[];
  valor_total?: number;
  duracao_total_minutos?: number;
  data_horario: string;
  usuario_id: string;
  usuario_nome?: string;
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
  /** Texto da evolução; a API persiste em `conteudo`. */
  descricao?: string;
  conteudo?: string;
  data_consulta?: string;
}

export interface AtualizarProntuarioRequest {
  titulo: string;
  descricao?: string;
  conteudo?: string;
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
  ativo?: boolean;
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
  /** Papel RBAC (MEDICO, DONO, …) — usar para filtros; `tipo_usuario` pode ser o nome amigável. */
  papel?: string;
  /** Máximo de atendimentos simultâneos no mesmo intervalo (com `permite_simultaneo`). */
  max_pacientes?: number;
  /** Se true, a agenda pode empilhar até `max_pacientes` agendamentos sobrepostos. */
  permite_simultaneo?: boolean;
  /** ID do tipo (Médico, Secretária, …) na clínica, quando a API envia aninhado. */
  tipo_usuario_id?: number;
  telefone?: string;
  clinic_id: string;
  ativo: boolean;
  criado_em: string;
}

/** Um dia da grade (API PUT /usuarios/:id/horarios). */
export interface UsuarioHorarioItem {
  dia_semana: number; // 0=domingo … 6=sábado
  horario_inicio: string; // HH:mm
  horario_fim: string;
  ativo: boolean;
}

export interface DefinirHorariosUsuarioRequest {
  horarios: UsuarioHorarioItem[];
}

export interface UsuarioHorarioItemResponse {
  id?: string;
  usuario_id?: string;
  dia_semana: number;
  dia_semana_texto?: string;
  horario_inicio: string;
  horario_fim: string;
  ativo: boolean;
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
  /** API: `faturamento` (período consultado) */
  faturamento?: number;
  faturamento_mensal?: number;
  periodo_inicio?: string;
  periodo_fim?: string;
  agendamentos_considerados?: number;
  total_faltas?: number;
  /** API: `taxa_no_show_percentual` */
  taxa_no_show_percentual?: number;
  no_show_taxa?: number;
  total_atendimentos?: number;
  tempo_medio_consulta?: number;
  lotacao_media?: number;
  taxa_conversao?: number;
  satisfacao_media?: number;
}

// Insurance / convênios (API: nome + ativo; campos extras opcionais)
export interface ConvenioRequest {
  nome: string;
  ativo: boolean;
  cnpj?: string;
  desconto_percentual?: number;
}

export interface ConvenioResponse {
  id: string;
  nome: string;
  ativo: boolean;
  clinica_id?: string;
  criado_em?: string;
  cnpj?: string;
  desconto_percentual?: number;
}

// Permission Types
export type TipoUsuario = "ADM_GERAL" | "DONO" | "MEDICO" | "SECRETARIA";

export interface RolePermission {
  tipo_usuario: TipoUsuario;
  telas_permitidas: string[];
}

// API Error Response (campos opcionais: o backend usa `erro` ou `error` em gin.H)
export interface ErrorResponse {
  status?: number;
  mensagem?: string;
  erro?: string;
  error?: string;
  detalhes?: string | Record<string, string>;
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
  /** Saídas só de lançamentos no período */
  totalSaidasLancamentos?: number;
  /** Soma mensal de custos fixos ativos */
  custosFixosMensal?: number;
  /** Meses-calendário usados para projetar custos fixos */
  mesesNoPeriodo?: number;
  /** custosFixosMensal × mesesNoPeriodo */
  custosFixosNoPeriodo?: number;
  /** Lançamentos + custos fixos no período */
  totalSaidas: number;
  saldoLiquido: number;
  /** Saldo só com lançamentos (sem custos fixos) */
  saldoLiquidoLancamentos?: number;
}

export interface CustoFixo {
  id: string;
  descricao: string;
  valor_mensal: number;
  ativo: boolean;
  clinica_id?: string;
  criado_em?: string;
  atualizado_em?: string;
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
