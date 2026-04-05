# Guia de Validação - Integração Financeira

Este documento descreve como validar que o Dashboard está calculando corretamente o lucro líquido incluindo despesas manuais.

## Checklist de Verificação

### ✅ 1. Acesso ao Dashboard

- [ ] Fazer login no sistema como `DONO_CLINICA` ou `ADM_GERAL`
- [ ] Navegar para Dashboard Operacional
- [ ] Verificar se há um novo card "Lucro Líquido"

### ✅ 2. Criar Agendamentos de Teste

- [ ] Ir para Agenda Médica
- [ ] Criar pelo menos 3 agendamentos para o mês atual
- [ ] Marcar como `REALIZADO`
- [ ] Voltar ao Dashboard
- [ ] Verificar se "Faturamento Mensal" aumentou (deve refletir valor dos agendamentos)

**Exemplo:**
- Agendamento 1: R$ 150,00
- Agendamento 2: R$ 200,00
- Agendamento 3: R$ 100,00
- **Esperado: Faturamento ≥ R$ 450,00**

### ✅ 3. Cadastrar Despesas no Módulo Financeiro

- [ ] Ir para Gestão Financeira
- [ ] Clique em "Novo Lançamento"
- [ ] Criar despesa 1:
  - Tipo: DESPESA
  - Descrição: "Aluguel da clínica"
  - Valor: R$ 2.000,00
  - Categoria: PARTICULAR
  - Data: Data de hoje

- [ ] Criar despesa 2:
  - Tipo: DESPESA
  - Descrição: "Contas de luz e água"
  - Valor: R$ 500,00
  - Categoria: PARTICULAR
  - Data: Data de hoje

**Total de despesas: R$ 2.500,00**

### ✅ 4. Validar Cálculo do Lucro Líquido

Voltar ao Dashboard e verificar:

```
Faturamento Mensal:      R$ 450,00
(-) Despesas cadastradas: R$ 2.500,00 (deve estar visível no card "Integração Financeira")
────────────────────────────────────
Lucro Líquido:           -R$ 2.050,00 ❌ (prejuízo)
```

**Importante:** O lucro deve estar NEGATIVO, refletindo que as despesas superaram o faturamento.

### ✅ 5. Validar Color Coding

- [ ] Lucro positivo: Card deve estar **VERDE** ✓
- [ ] Lucro negativo: Card deve estar **LARANJA/VERMELHO** ⚠️
- [ ] Ícone: Deve mostrar `TrendingUp` (seta subindo) ou `TrendingDown` (seta descendo)

### ✅ 6. Adicionar Mais Receita

- [ ] Criar novo agendamento:
  - Valor: R$ 3.000,00
  - Marcar como REALIZADO
  
- [ ] Voltar ao Dashboard

**Novo faturamento esperado: R$ 3.450,00**

**Novo lucro esperado:**
```
3.450 - 2.500 = R$ 950,00 ✓ (positivo, card deve estar verde)
```

### ✅ 7. Testar Filtros Financeiros

- [ ] No Módulo Financeiro, aplicar filtro por período
- [ ] Usar "Data Início" = primeiro dia do mês
- [ ] Usar "Data Fim" = hoje
- [ ] Verificar se a tabela e resumo se atualizam

- [ ] Aplicar filtro por Categoria "CONVENIO"
- [ ] Verificar se busca por lançamentos apenas dessa categoria

### ✅ 8. Validar Info Card "Integração Financeira"

No Dashboard, procurar o card verde com ícone 💰:

```
┌────────────────────────────────┐
│  💰 Integração Financeira      │
├────────────────────────────────┤
│ Faturamento:    R$ 3.450,00    │
│ (-) Despesas:   R$ 2.500,00    │
├────────────────────────────────┤
│ Lucro Líquido:  R$   950,00    │
│                                │
│ ✓ Inclui receitas de          │
│   agendamentos REALIZADO       │
│ ✓ Abate despesas manuais       │
│ ✓ Atualizado mensalmente       │
└────────────────────────────────┘
```

### ✅ 9. Testar Atualização Automática

- [ ] Criar um novo gasto no Módulo Financeiro:
  - Tipo: DESPESA
  - Valor: R$ 200,00
  - Descrição: "Teste atualização"
  
- [ ] Ir para o Dashboard
- [ ] Clicar botão "Atualizar"
- [ ] Aguardar 2-3 segundos
- [ ] Verificar se o Lucro Líquido diminuiu em R$ 200,00

**Depois:** R$ 950 - 200 = **R$ 750,00**

### ✅ 10. Testar Período Correto

- [ ] Verificar data no topo do navegador
- [ ] Verificar se o Dashboard está usando "mês atual até hoje"
- [ ] Exemplo: Se hoje é 15 de Maio, deve buscar 01/05 a 15/05

**Validar:**
- [ ] Criar despesa com data do mês anterior (Ex: 15/04)
- [ ] Deverá NÃO aparecer no cálculo atual (está em período diferente)
- [ ] Criar despesa com data de amanhã (mês que vem)
- [ ] Deverá NÃO aparecer no cálculo (ainda não chegou)

## Testes Negativos (Problemas a Evitar)

### ❌ Problema 1: Despesas Ignoradas

**Sintoma:** Lucro = Faturamento (despesas não sendo subtraídas)

**Validação:**
```
Se Faturamento = R$ 10.000
E Despesas     = R$  5.000

Lucro NUNCA deve ser R$ 10.000 ❌
Lucro DEVE ser     R$  5.000 ✓
```

**Se isso acontecer:** Há um bug na integração.

### ❌ Problema 2: Múltiplas Despesas Não Agregadas

**Sintoma:** Apenas a última despesa é considerada

**Validação:**
```
Despesa 1: R$ 1.000
Despesa 2: R$ 2.000
Despesa 3: R$   500
────────────────────
Total: R$ 3.500

Se only mostra R$ 500 ❌ há um bug
Se mostra R$ 3.500 ✓ correto
```

### ❌ Problema 3: Período Incorreto

**Sintoma:** Buscando dados de meses diferentes

**Validação:**
```
Hoje: 15/05/2026
Expected: 01/05 até 15/05/2026

Se buscar 01/04 até 15/04 ❌ período errado
Se buscar 01/05 até 15/05 ✓ correto
```

## Teste de Regressão

Antes de commit, verificar:

### Agenda Module
- [ ] Agendamentos ainda funcionam normalmente
- [ ] Status REALIZADO still works
- [ ] Valores são salvos corretamente

### Financeiro Module
- [ ] Despesas são criadas sem erro
- [ ] Filtros funcionam
- [ ] Receitas manuais são consideradas

### Dashboard
- [ ] Carrega sem erros
- [ ] Faturamento exato
- [ ] Lucro com despesas abatidas
- [ ] Info cards exibem dados corretos
- [ ] Botão "Atualizar" refetch data

## Dados de Teste Recomendados

### Cenário 1: Clínica Saudável
```json
{
  "agendamentos_realizados": [
    { "valor": 150, "tipo": "PARTICULAR" },
    { "valor": 200, "tipo": "PARTICULAR" },
    { "valor": 300, "tipo": "CONVENIO" },
    { "valor": 250, "tipo": "PARTICULAR" }
  ],
  "despesas": [
    { "descricao": "Aluguel", "valor": 1000, "tipo": "DESPESA" },
    { "descricao": "Luz", "valor": 200, "tipo": "DESPESA" },
    { "descricao": "Telefone", "valor": 100, "tipo": "DESPESA" }
  ],
  "receitas_extras": [
    { "descricao": "Consultoria", "valor": 500, "tipo": "RECEITA" }
  ],
  "resultado_esperado": {
    "faturamento": 900,
    "entradas_extras": 500,
    "total_receitas": 1400,
    "total_despesas": 1300,
    "lucro_esperado": 100
  }
}
```

### Cenário 2: Clínica com Prejuízo
```json
{
  "agendamentos_realizados": [
    { "valor": 300 },
    { "valor": 200 }
  ],
  "despesas": [
    { "descricao": "Aluguel", "valor": 2000 },
    { "descricao": "Salários", "valor": 2000 },
    { "descricao": "Insumos", "valor": 500 }
  ],
  "resultado_esperado": {
    "faturamento": 500,
    "total_despesas": 4500,
    "lucro_esperado": -4000
  }
}
```

## Performance Check

- [ ] Dashboard carrega em < 2 segundos
- [ ] Atualizar dados é < 1 segundo
- [ ] Sem memory leaks após 10 cliques
- [ ] Funciona em mobile (responsivo)

## Segurança Check

- [ ] Usuário MEDICO não vê total de lucro (restrito)
- [ ] Usuário SECRETARIO não vê total de lucro (restrito)
- [ ] Apenas DONO_CLINICA e ADM_GERAL veem todos dados
- [ ] Dados são atualizados via API segura

## Conclusão

Se todos os testes passarem ✓:

- ✅ Despesas manuais NÃO são ignoradas
- ✅ Faturamento de agendamentos é somado
- ✅ Lucro líquido é preciso
- ✅ Integração entre módulos funciona
- ✅ Dashboard reflete estado financeiro real

**Sistema pronto para produção! 🚀**