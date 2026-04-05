# Integração Financeira do Dashboard

## Visão Geral

O Dashboard Operacional agora integra dados de dois módulos principais para calcular o **Lucro Líquido** com precisão:

1. **Módulo de Agenda Médica**: Fornece receitas de agendamentos marcados como _REALIZADO_
2. **Módulo de Gestão Financeira**: Fornece despesas manuais contabilizadas

## Fórmula de Cálculo

```
Lucro Líquido = Faturamento Mensal - Despesas do Mês
```

Onde:
- **Faturamento Mensal**: Soma do valor de todos os agendamentos com status `REALIZADO` no período
- **Despesas do Mês**: Soma de todos os lançamentos com tipo `DESPESA` no Módulo de Gestão Financeira

## Integração de Dados

### Fluxo de Dados

```
┌─────────────────────┐
│   Agenda Médica     │
│                     │
│  Agendamentos      │
│  REALIZADO         │
│  ─────────────→ Faturamento
└─────────────────────┘
                      │
                      ├─→ DASHBOARD ─→ Lucro Líquido
                      │
┌─────────────────────┐│
│  Gestão Financeira  │
│                     │
│  Despesas Manual    │
│  Categoria: Receita │
│  Categoria: Despesa │
│  ─────────────────→ Entradas/Saídas
└─────────────────────┘
```

### Endpoints Utilizados

**Métricas Operacionais:**
```
GET /dashboard/metricas-operacionais
Response: {
  faturamento_mensal: number,
  no_show_taxa: number,
  total_atendimentos: number,
  ...outras métricas
}
```

**Resumo Financeiro Mensal:**
```
GET /clinicas/financeiro/resumo?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
Response: {
  totalEntradas: number,
  totalSaidas: number,
  saldoLiquido: number
}
```

## Componentes Alterados

### 1. Hook: `useResumoFinanceiroMes()` (novo)

Arquivo: `src/hooks/use-dashboard.ts`

```typescript
export const useResumoFinanceiroMes = (clinicaId?: string) => {
  // Busca automaticamente o mês atual (01/mês até hoje)
  // Caching de 5 minutos
  // Tratamento de erro para não quebrar o dashboard
}
```

### 2. Dashboard Page

Arquivo: `src/app/(dashboard)/dashboard/page.tsx`

**Cálculos Adicionados:**
- `lucroLiquido`: Faturamento - Despesas
- `saldoFinanceiro`: Entradas - Saídas (do módulo financeiro)
- `lucroTotal`: Melhor estimativa considerando ambas as fontes

**Novo Metric Card:**
- Título: "Lucro Líquido"
- Descrição: "Faturamento - Despesas do mês"
- Ícone: `DollarSign`
- Trending: Sobe se positivo, desce se negativo
- Variant: Sucesso (verde) se positivo, warning (laranja) se negativo

**Novo Info Card:**
- "Integração Financeira"
- Exibe breakdown: Faturamento - Despesas = Lucro
- Mostra checklist explicando quais dados estão inclusos

### 3. Helper Function

Arquivo: `src/lib/utils/lucro-helper.ts`

```typescript
export function obterLucroFinal(
  lucroCalculadoAgenda: number,
  saldoModuloFinanceiro: number
): number
```

Seleciona a melhor estimativa considerando ambas as fontes.

## Garantias de Precisão

### ✅ Despesas Manuais São Incluídas

Todas as despesas cadastradas no **Módulo de Gestão Financeira** são:
- Automaticamente sincronizadas ao Dashboard
- Calculadas por período (mês atual)
- Abatidas do lucro líquido

### ✅ Receitas de Agendamento São Consideradas

Cada agendamento com status `REALIZADO`:
- É contabilizado como receita no faturamento mensal
- Contribui para o cálculo do lucro

### ✅ Período Automático

- Dashboard recalcula automaticamente o mês corrente
- Caso o usuário esteja em abril, busca de 01/04 até data de hoje
- Atualização a cada 5 minutos (cache)

## Exemplos de Cenários

### Cenário 1: Receitas vs Despesas Balanceadas

```
Agendamentos REALIZADO em Abril:  R$ 10.000,00
Despesas contabilizadas em Abril:
  - Aluguel:                       R$ 3.000,00
  - Luz/Água:                      R$ 800,00
  - Insumos:                       R$ 1.500,00
  
Lucro Líquido = 10.000 - (3.000 + 800 + 1.500) = R$ 4.700,00 ✓
```

### Cenário 2: Receitas Extras Incluídas

```
Faturamento de agendamentos:      R$ 10.000,00
+ Receita extra (consultoria):    R$    800,00
- Despesa (evento marketing):     R$  1.000,00

Saldo Total = 10.000 + 800 - 1.000 = R$ 9.800,00 ✓
```

### Cenário 3: Prejuízo

```
Faturamento:                      R$  5.000,00
Despesas:                         R$  8.000,00

Lucro = 5.000 - 8.000 = -R$ 3.000,00 (Prejuízo) ⚠️
```

## Controle de Acesso

**Quem pode ver o Lucro Líquido?**

Segundo as regras de permissão do sistema:
- ✅ `DONO_CLINICA` - Vê todos os dados completos
- ✅ `ADM_GERAL` - Vê todos os dados completos
- ⚠️ `MEDICO` - Vê apenas lançamentos próprios
- ⚠️ `SECRETARIO` - Vê apenas lançamentos próprios

_Implementação de permissões no frontend está no Módulo Financeiro_

## Performance

- **Cache**: 5 minutos para métricas operacionais, 5 minutos para resumo financeiro
- **Retry**: 2 tentativas para métricas, 1 para resumo financeiro
- **Error Handling**: Falsos ao buscar resumo não quebram o dashboard

## Testes Recomendados

1. **Criar agendamentos e marcar como REALIZADO**
   - Verificar aumento no Faturamento
   - Verificar aumento no Lucro Líquido

2. **Cadastrar despesas no Módulo Financeiro**
   - Verificar diminuição no Lucro Líquido
   - Verificar inclusão de diferentes categorias (PARTICULAR/CONVENIO)

3. **Testar período do mês**
   - Simular diferentes datas
   - Validar que o cálculo está correto

4. **Testar com múltiplas clínicas**
   - Se aplicável, validar que cada clínica tem seus próprios dados

## Troubleshooting

### 💥 Dashboard mostra Lucro negativo

- Verifique se despesas estão registradas corretamente
- Acesse o Módulo Financeiro para validar lançamentos
- Certifique-se que agendamentos estão marcados como REALIZADO

### ⚠️ Lucro não atualiza

- Pressione botão "Atualizar" no topo do dashboard
- Verificar se há conexão com a API
- Próxima atualização automática em 5 minutos

### 🔒 Não consigo ver os valores

- Verifique sua permissão de acesso (role)
- Apenas DONO e ADM veem todos os valores
- Se for MEDICO/SECRETARIO, vê apenas próprios dados

## Próximas Melhorias

- [ ] Exportar relatório financeiro em PDF/CSV
- [ ] Gráfico de tendência de lucro ao longo do tempo
- [ ] Alertas de despesas acima do esperado
- [ ] Previsão de lucro futuro
- [ ] Comparação mês a mês