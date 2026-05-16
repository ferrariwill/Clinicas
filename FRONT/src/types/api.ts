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
  /** MEDICO | FISIOTERAPEUTA | DENTISTA — papéis DONO e MEDICO na clínica. */
  especialidade?: string;
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
  /** ISO: lembrete de retorno / 1ª sessão (plano de tratamento). */
  plano_retorno_previsto_em?: string;
  /** Total de sessões previstas no último plano por sessões. */
  plano_sessoes_previstas?: number;
}

/** Corpo de POST /clinicas/plano-tratamento */
export interface PlanoTratamentoRequest {
  modo: "RETORNO" | "SESSOES";
  paciente_id: number;
  usuario_id: number;
  procedimento_id: number;
  data_hora: string;
  sessoes_previstas?: number;
  intervalo_dias?: number;
  observacoes?: string;
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

/** POST /clinicas/agenda/lote/preview — dias_semana: 0=domingo … 6=sábado (igual Go/JS). */
export interface PreviewAgendaLoteRequest {
  paciente_id: string;
  usuario_id: string;
  procedimento_id?: string;
  procedimento_ids?: string[];
  quantidade_sessoes: number;
  dias_semana: number[];
  hora: string;
  data_referencia: string;
}

export interface PreviewAgendaLoteSessao {
  indice: number;
  data_hora: string;
  ok: boolean;
  erro?: string;
}

/** POST /clinicas/agenda/lote */
export interface CriarAgendaLoteRequest {
  paciente_id: string;
  usuario_id: string;
  procedimento_id?: string;
  procedimento_ids?: string[];
  sessoes: { data_hora: string }[];
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
  /** Especialidade do profissional (MEDICO / FISIOTERAPEUTA / DENTISTA), quando a API envia o usuário. */
  usuario_especialidade?: string;
  status: string;
  conflito?: boolean;
  /** ISO: médico liberou para secretaria cobrar (módulo Asaas). */
  liberado_cobranca_em?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type CobrancaConsultaResponse = {
  id: string;
  clinica_id: string;
  agenda_id: string;
  valor_bruto: number;
  percentual_split_snapshot: number;
  taxa_sistema_valor: number;
  taxa_gateway_valor: number;
  valor_liquido_clinica: number;
  status: string;
  metodo: string;
  valor_recebido?: number | null;
  troco?: number | null;
  asaas_payment_id?: string;
  pix_copia_e_cola?: string;
  pix_qr_code_base64?: string;
  link_pagamento?: string;
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
  /** Nome do profissional que registrou (quando a API envia `profissional`). */
  profissional_nome?: string;
  data_consulta?: string;
  criado_em: string;
  atualizado_em: string;
  editavel: boolean; // false se > 24h
}

export interface CriarAtestadoRequest {
  paciente_id: string;
  tipo: "HORAS" | "DIAS";
  quantidade: number;
  cid10: string;
  /** Opcional: horário 24h HH:MM; envie início e fim juntos. */
  consulta_hora_inicio?: string;
  consulta_hora_fim?: string;
}

export interface AtestadoMedicoResponse {
  id: string;
  paciente_id: string;
  profissional_id?: string;
  tipo: "HORAS" | "DIAS";
  quantidade: number;
  cid10: string;
  texto_gerado: string;
  criado_em: string;
  profissional?: { nome?: string; especialidade?: string };
}

// Procedure Types
export interface ProcedimentoRequest {
  nome: string;
  descricao?: string;
  duracao_minutos: number;
  valor: number;
  /** Vazio: todas; senão MEDICO | FISIOTERAPEUTA | DENTISTA (igual ao cadastro do profissional). */
  especialidade?: string;
}

export interface ProcedimentoResponse {
  id: string;
  nome: string;
  descricao?: string;
  duracao_minutos: number;
  valor: number;
  especialidade?: string;
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
  /** MEDICO | FISIOTERAPEUTA | DENTISTA quando aplicável. */
  especialidade?: string;
  /** Papel RBAC (MEDICO, DONO, …) — usar para filtros; `tipo_usuario` pode ser o nome amigável. */
  papel?: string;
  /** Máximo de atendimentos simultâneos no mesmo intervalo (com `permite_simultaneo`). */
  max_pacientes?: number;
  /** Se true, a agenda pode empilhar até `max_pacientes` agendamentos sobrepostos. */
  permite_simultaneo?: boolean;
  /** Percentual 0–100 do valor bruto da consulta pago ao profissional (repasse). */
  porcentagem_repasse?: number;
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

/** GET /clinicas/me/dashboard-clinico — prontuário + atestados do profissional logado. */
export interface MedicoDashboardClinicoResponse {
  semanas: number;
  cid_mais_comuns: MedicoDashboardCIDItem[];
  volume_por_semana: MedicoDashboardSemanaVol[];
}

export interface MedicoDashboardCIDItem {
  cid: string;
  total: number;
}

export interface MedicoDashboardSemanaVol {
  ano: number;
  semana: number;
  rotulo: string;
  prontuarios: number;
  atestados: number;
  total: number;
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
  /** Meses-calendário cobertos pelo intervalo (referência; custos fixos usam dia previsto de pagamento) */
  mesesNoPeriodo?: number;
  /** Soma dos custos fixos ativos cujo vencimento (dia do mês) cai dentro do período filtrado */
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
  /** Dia do mês em que o pagamento costuma ocorrer (1–31); usado no resumo do período */
  dia_previsto_pagamento: number;
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

/** GET /clinicas/financeiro/fechamento/preview */
export interface FechamentoPreviewResponse {
  data_inicio: string;
  data_fim: string;
  quantidade_lancamentos: number;
  quantidade_itens_repasse: number;
  total_entradas: number;
  total_saidas: number;
  total_repasses: number;
  lucro_liquido: number;
  /** Objeto JSON com lancamentos, repasse_linhas e repasse_detalhes. */
  detalhamento: unknown;
}

export interface FechamentoDetalhamentoPayload {
  lancamentos: FechamentoDetalheLancamento[];
  repasse_linhas: RepasseLinhaProfissional[];
  repasse_detalhes: RepasseDetalheProfissional[];
}

export interface FechamentoDetalheLancamento {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  usuario_id: number;
  criado_em: string;
}

export interface RepasseLinhaProfissional {
  usuario_id: number;
  nome: string;
  especialidade: string;
  porcentagem_repasse: number;
  quantidade_atendimentos: number;
  valor_base_total: number;
  valor_repasse_total: number;
}

export interface RepasseDetalheProfissional {
  cobranca_id: number;
  agenda_id: number;
  usuario_id: number;
  data_hora: string;
  paciente_nome: string;
  valor_base: number;
  porcentagem_repasse: number;
  valor_repasse: number;
}

export interface FechamentoListaItem {
  id: number;
  data_inicio: string;
  data_fim: string;
  total_entradas: number;
  total_saidas: number;
  total_repasses: number;
  lucro_liquido: number;
  status: string;
  criado_em: string;
}

export interface FechamentoDetalheResponse {
  id: number;
  clinica_id: number;
  data_inicio: string;
  data_fim: string;
  total_entradas: number;
  total_saidas: number;
  total_repasses: number;
  lucro_liquido: number;
  status: string;
  criado_em: string;
  detalhamento_json: FechamentoDetalhamentoPayload;
}

export interface CriarFechamentoRequest {
  dataInicio: string;
  dataFim: string;
}
