/**
 * Cálculo integrado de Lucro Líquido
 * 
 * Esta função demonstra como o Dashboard integra dois módulos:
 * 1. Agenda Médica: Agendamentos marcados como REALIZADO (receitas)
 * 2. Módulo Financeiro: Lançamentos manuais (receitas e despesas)
 * 
 * Fórmula de cálculo:
 * Lucro Líquido = Faturamento Mensal - Despesas do Módulo Financeiro
 * 
 * Onde:
 * - Faturamento Mensal: Soma dos agendamentos com status REALIZADO no período
 * - Despesas: Lançamentos com tipo DESPESA cadastrados no módulo de Gestão Financeira
 * 
 * Obs: O sistema também considera receitas manuais cadastradas no Módulo Financeiro,
 * portanto o saldo total pode diferir do faturamento se houver receitas extras.
 */

export function calcularLucroLiquido(
  faturamentoMensal: number,
  totalDespesas: number
): number {
  return faturamentoMensal - totalDespesas
}

export function calcularSaldoTotal(
  totalEntradas: number,
  totalSaidas: number
): number {
  return totalEntradas - totalSaidas
}

/**
 * Retorna o lucro mais preciso considerando ambas as fontes de dados
 */
export function obterLucroFinal(
  lucroCalculadoAgenda: number,
  saldoModuloFinanceiro: number
): number {
  // Usa o saldo do módulo financeiro se disponível (mais completo)
  // pois ele inclui receitas/despesas manuais
  return saldoModuloFinanceiro || lucroCalculadoAgenda
}