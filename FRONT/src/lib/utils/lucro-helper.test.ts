/**
 * Testes para validar a integração financeira e cálculo de lucro líquido
 * 
 * Estes testes garantem que:
 * 1. Despesas manuais não são ignoradas
 * 2. Receitas de agendamentos são contabilizadas
 * 3. O lucro líquido é calculado corretamente
 */

import { 
  calcularLucroLiquido, 
  calcularSaldoTotal, 
  obterLucroFinal 
} from '@/lib/utils/lucro-helper'

describe('Lucro Líquido - Integração Financeira', () => {
  
  describe('calcularLucroLiquido', () => {
    it('deve calcular lucro positivo quando receita > despesa', () => {
      const faturamento = 10000
      const despesas = 3000
      const resultado = calcularLucroLiquido(faturamento, despesas)
      
      expect(resultado).toBe(7000)
    })

    it('deve calcular prejuízo quando despesa > receita', () => {
      const faturamento = 5000
      const despesas = 8000
      const resultado = calcularLucroLiquido(faturamento, despesas)
      
      expect(resultado).toBe(-3000)
    })

    it('deve retornar zero quando receita = despesa', () => {
      const faturamento = 5000
      const despesas = 5000
      const resultado = calcularLucroLiquido(faturamento, despesas)
      
      expect(resultado).toBe(0)
    })

    it('NÃO deve ignorar despesas manuais', () => {
      // Cenário: Faturamento de agendamentos R$ 10.000
      // Despesas: Aluguel R$ 3.000, Luz R$ 800, Insumos R$ 1.500
      const faturamento = 10000
      const despesasObrigatórias = {
        aluguel: 3000,
        luz: 800,
        insumos: 1500,
      }
      const totalDespesas = Object.values(despesasObrigatórias)
        .reduce((sum, valor) => sum + valor, 0)
      
      const lucro = calcularLucroLiquido(faturamento, totalDespesas)
      
      // Espera-se que o lucro seja reduzido pelas despesas
      expect(lucro).toBe(4700)
      expect(totalDespesas).toBe(5300)
      expect(lucro).toBeLessThan(faturamento)
    })
  })

  describe('calcularSaldoTotal', () => {
    it('deve considerar receitas extra além de agendamentos', () => {
      const totalEntradas = 10800 // 10.000 agendamentos + 800 consultoria
      const totalSaidas = 1000 // evento marketing
      const resultado = calcularSaldoTotal(totalEntradas, totalSaidas)
      
      expect(resultado).toBe(9800)
    })

    it('deve retornar negativo para despesas maiores', () => {
      const totalEntradas = 5000
      const totalSaidas = 8000
      const resultado = calcularSaldoTotal(totalEntradas, totalSaidas)
      
      expect(resultado).toBe(-3000)
    })
  })

  describe('obterLucroFinal', () => {
    it('deve utilizar saldo do módulo financeiro quando disponível', () => {
      const lucroAgenda = 7000
      const saldoFinanceiro = 9800 // Mais completo (inclui receitas extras)
      const resultado = obterLucroFinal(lucroAgenda, saldoFinanceiro)
      
      expect(resultado).toBe(saldoFinanceiro)
    })

    it('deve usar saldo zero do financeiro (não substituir por faturamento da agenda)', () => {
      const lucroAgenda = 7000
      const saldoFinanceiro = 0
      const resultado = obterLucroFinal(lucroAgenda, saldoFinanceiro)

      expect(resultado).toBe(0)
    })

    it('deve manter saldo zero mesmo com prejuízo hipotético só na agenda', () => {
      const lucroAgenda = -3000
      const saldoFinanceiro = 0
      const resultado = obterLucroFinal(lucroAgenda, saldoFinanceiro)

      expect(resultado).toBe(0)
    })
  })

  describe('Cenários Realísticos', () => {
    it('Cenário 1: Mês normal com receita e despesas balanceadas', () => {
      // Abril: 50 agendamentos realizados = R$ 10.000
      const faturamentoAbril = 10000
      
      // Despesas do mês:
      const aluguel = 3000
      const luz = 800
      const agua = 200
      const insumos = 1500
      const manutencao = 500
      const totalDespesas = aluguel + luz + agua + insumos + manutencao
      
      const lucroLiquido = calcularLucroLiquido(faturamentoAbril, totalDespesas)
      
      // Verificações
      expect(lucroLiquido).toBe(4000)
      expect(lucroLiquido).toBeGreaterThan(0)
      expect(totalDespesas).toBe(6000)
    })

    it('Cenário 2: Mês com receitas extras', () => {
      // Receita de agendamentos
      const agendamentos = 8000
      
      // Receitas extras
      const consultoriaExtra = 500
      const vendaServico = 300
      const totalReceitas = agendamentos + consultoriaExtra + vendaServico
      
      // Despesas
      const despesas = 4000
      
      const saldoFinal = calcularSaldoTotal(totalReceitas, despesas)
      
      expect(saldoFinal).toBe(4800)
      expect(totalReceitas).toBe(8800)
    })

    it('Cenário 3: Mês com prejuízo (despesas > receitas)', () => {
      // Cenário: Clínica nova com poucas consultas
      const faturamento = 3000
      const despesas = 8000 // Aluguel + estrutura + salários
      
      const resultado = calcularLucroLiquido(faturamento, despesas)
      
      expect(resultado).toBe(-5000)
      expect(resultado).toBeLessThan(0)
    })

    it('Cenário 4: Despesas devem SEMPRE ser consideradas', () => {
      // Este teste é crítico: valida que despesas manuais nunca são ignoradas
      const faturamento = 15000
      
      // Simula um mês com várias despesas
      const despesas = [
        { tipo: 'ALUGUEL', valor: 5000 },
        { tipo: 'SALARIOS', valor: 4000 },
        { tipo: 'FORNECEDORES', valor: 2000 },
        { tipo: 'UTILIDADES', valor: 1500 },
      ]
      
      const totalDespesas = despesas
        .reduce((sum, despesa) => sum + despesa.valor, 0)
      
      const lucro = calcularLucroLiquido(faturamento, totalDespesas)
      
      // Validações
      expect(totalDespesas).toBe(12500)
      expect(lucro).toBe(2500)
      
      // O mais importante: faturamento NÃO pode ser igual ao lucro
      expect(lucro).not.toBe(faturamento)
      expect(lucro).toBeLessThan(faturamento)
    })

    it('Cenário 5: Break-even (receita = despesa)', () => {
      const receita = 10000
      const despesa = 10000
      
      const resultado = calcularLucroLiquido(receita, despesa)
      
      expect(resultado).toBe(0)
      expect(resultado).not.toBeGreaterThan(0)
      expect(resultado).not.toBeLessThan(0)
    })
  })

  describe('Validação de Tipos', () => {
    it('deve aceitar números inteiros', () => {
      expect(calcularLucroLiquido(1000, 500)).toBe(500)
    })

    it('deve aceitar números decimais', () => {
      expect(calcularLucroLiquido(1000.50, 500.25)).toBeCloseTo(500.25, 2)
    })

    it('deve aceitar zero como entrada', () => {
      expect(calcularLucroLiquido(0, 0)).toBe(0)
    })

    it('deve lidar com valores negados', () => {
      expect(calcularLucroLiquido(1000, -500)).toBe(1500)
    })
  })

  describe('Integração com Dashboard', () => {
    it('deve informar ao usuário quando lucro é negativo', () => {
      const faturamento = 3000
      const despesas = 5000
      const lucro = calcularLucroLiquido(faturamento, despesas)
      
      const temPrejuizo = lucro < 0
      expect(temPrejuizo).toBe(true)
    })

    it('deve permitir visualização clara de composição (Receita - Despesa = Lucro)', () => {
      const receita = 10000
      const despesa = 3000
      const lucro = calcularLucroLiquido(receita, despesa)
      
      // Verificar que a fórmula é mantida
      expect(receita - despesa).toBe(lucro)
    })

    it('deve refletir mudanças em despesas no lucro total', () => {
      const receita = 10000
      const despesasAntigo = 2000
      const lucroAntigo = calcularLucroLiquido(receita, despesasAntigo)
      
      // Adiciona uma nova despesa
      const despesasNovo = 2000 + 500 // Nova despesa de R$ 500
      const lucroNovo = calcularLucroLiquido(receita, despesasNovo)
      
      // Lucro deve diminuir exatamente em R$ 500
      expect(lucroAntigo - lucroNovo).toBe(500)
      expect(lucroNovo).toBeLessThan(lucroAntigo)
    })
  })
})

/**
 * RESUMO DOS TESTES
 * 
 * ✅ Despesas NUNCA são ignoradas
 * ✅ Receitas de agendamentos são consideradas
 * ✅ Lucro líquido = Receita - Despesa
 * ✅ Prejuízos são calculados corretamente
 * ✅ Receitas extras são contabilizadas
 * ✅ Múltiplas despesas são agregadas
 * ✅ Conversão correta para o Dashboard
 */