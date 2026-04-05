# Especificação API Backend - Integração Financeira

## Visão Geral

Backend deve fornecer dois endpoints principais para suportar o cálculo integrado de lucro líquido:

1. **Métricas Operacionais** - Faturamento de agendamentos
2. **Resumo Financeiro** - Despesas de lançamentos manuais

## Endpoints Requeridos

### 1. GET `/dashboard/metricas-operacionais`

**Propósito:** Retornar faturamento mensal baseado em agendamentos REALIZADO

**Query Parameters:**
```
clinicaId (opcional): string - ID da clínica
```

**Response:**
```json
{
  "faturamento_mensal": 10000.50,
  "no_show_taxa": 5.2,
  "total_atendimentos": 42,
  "tempo_medio_consulta": 30,
  "lotacao_media": 75.5,
  "taxa_conversao": 65.0,
  "satisfacao_media": 4.8
}
```

**Lógica Backend:**
```
SELECT SUM(agendamento.valor_servico) as faturamento_mensal
FROM agendamentos
WHERE 
  status = 'REALIZADO' 
  AND MONTH(data_agendamento) = MONTH(CURRENT_DATE)
  AND YEAR(data_agendamento) = YEAR(CURRENT_DATE)
  AND clinica_id = @clinicaId
```

**Importante:**
- ✅ Incluir APENAS agendamentos com status `REALIZADO`
- ✅ Filtrar por mês atual
- ✅ Respeitar clinica_id se fornecido
- ✅ Calcular outras métricas também

---

### 2. GET `/clinicas/financeiro/resumo`

**Propósito:** Retornar sum de receitas e despesas de lançamentos manuais

**Query Parameters:**
```
data_inicio (opcional): string (YYYY-MM-DD) - Data inicial
data_fim (opcional): string (YYYY-MM-DD) - Data final
```

**Response:**
```json
{
  "totalEntradas": 11800.00,
  "totalSaidas": 5300.50,
  "saldoLiquido": 6499.50
}
```

**Lógica Backend:**
```
-- Receitas (RECEITA = entrada, DESPESA = saída)
SELECT 
  SUM(CASE WHEN tipo = 'RECEITA' THEN valor ELSE 0 END) as totalEntradas,
  SUM(CASE WHEN tipo = 'DESPESA' THEN valor ELSE 0 END) as totalSaidas,
  SUM(CASE WHEN tipo = 'RECEITA' THEN valor ELSE -valor END) as saldoLiquido
FROM lancamentos_financeiros
WHERE 
  DATA(data) BETWEEN @dataInicio AND @dataFim
  AND clinica_id = @clinicaId
```

**Importante:**
- ✅ Incluir RECEITA e DESPESA
- ✅ Respeitar período (data_inicio a data_fim)
- ✅ Calcular saldoLiquido = entradas - saídas
- ✅ Suportar clínicas para acesso multi-tenant

---

## Fluxo de Dados

```
FRONTEND                          BACKEND                    DATABASE
═══════════════════════════════════════════════════════════════════════════

Dashboard Page
    │
    ├─ useDashboardMetrics()───→ GET /dashboard/metricas-operacionais
    │                                  ↓
    │                            Query Agendamentos
    │                            WHERE status = REALIZADO
    │                            AND mes_atual
    │                                  ↓
    │   Faturamento ←────────── 10.000,00
    │
    │
    ├─ useResumoFinanceiroMes()─→ GET /clinicas/financeiro/resumo
    │                                  ↓
    │                            Query Lançamentos
    │                            WHERE data BETWEEN inicio E fim
    │                                  ↓
    │   Despesas ←────────────── 2.500,00
    │   Saldo ←──────────────── 7.500,00
    │
    │
    ├─ Calcular Lucro
    │  Lucro = 10.000 - 2.500 = 7.500
    │
    └─ Renderizar Card
       "Lucro Líquido: R$ 7.500,00" ✓
```

## Filtros de Segurança

### Controle de Acesso

**Endpoint: `/dashboard/metricas-operacionais`**
- ✅ Todos os usuários podem acessar
- ✅ Retorna dados agregados por clínica
- ✅ Filtro automático por clinica_id do usuário

**Endpoint: `/clinicas/financeiro/resumo`**
- ✅ Rotas: DONO_CLINICA, ADM_GERAL veem TUDO
- ⚠️ Rotas: MEDICO, SECRETARIO veem apenas próprios lançamentos
- ✅ Frontend deve mascarar valores se role não tiver permissão

---

## Estrutura de Dados Esperada

### Tabela: Agendamentos

```sql
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY,
  clinica_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  paciente_id UUID NOT NULL,
  
  -- Importante para faturamento
  valor_servico DECIMAL(10, 2),
  status ENUM('AGENDADO', 'REALIZADO', 'CANCELADO', 'NO_SHOW'),
  
  -- Temporal
  data_agendamento DATETIME,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
);

-- Índice para performance
CREATE INDEX idx_agendamentos_status_data 
ON agendamentos(clinica_id, status, data_agendamento);
```

### Tabela: Lançamentos Financeiros

```sql
CREATE TABLE lancamentos_financeiros (
  id UUID PRIMARY KEY,
  clinica_id UUID NOT NULL,
  usuario_id UUID NOT NULL, -- Quem registrou
  
  -- Identificação
  descricao VARCHAR(255) NOT NULL,
  tipo ENUM('RECEITA', 'DESPESA') NOT NULL,
  categoria ENUM('PARTICULAR', 'CONVENIO') NOT NULL,
  
  -- Valores
  valor DECIMAL(10, 2) NOT NULL,
  
  -- Rastreamento
  agenda_id UUID, -- Referência opcional para agendamento
  data DATE NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (agenda_id) REFERENCES agendamentos(id)
);

-- Índices para performance
CREATE INDEX idx_lancamentos_data ON lancamentos_financeiros(
  clinica_id, data, tipo
);
CREATE INDEX idx_lancamentos_usuario ON lancamentos_financeiros(
  usuario_id
);
```

---

## Exemplos de Queries

### Query 1: Faturamento do Mês

```sql
-- Setembro de 2026
SELECT 
  SUM(valor_servico) as faturamento_mensal,
  COUNT(*) as total_atendimentos,
  AVG(valor_servico) as valor_medio
FROM agendamentos
WHERE 
  clinica_id = '123e4567-e89b-12d3-a456-426614174000'
  AND status = 'REALIZADO'
  AND MONTH(data_agendamento) = 9
  AND YEAR(data_agendamento) = 2026
```

**Result:**
```
faturamento_mensal: 15000.00
total_atendimentos: 50
valor_medio: 300.00
```

### Query 2: Despesas do Período

```sql
-- De 01/09/2026 a 15/09/2026
SELECT 
  SUM(CASE WHEN tipo = 'RECEITA' THEN valor ELSE 0 END) as totalEntradas,
  SUM(CASE WHEN tipo = 'DESPESA' THEN valor ELSE 0 END) as totalSaidas,
  SUM(CASE WHEN tipo = 'RECEITA' THEN valor ELSE -valor END) as saldoLiquido
FROM lancamentos_financeiros
WHERE 
  clinica_id = '123e4567-e89b-12d3-a456-426614174000'
  AND data BETWEEN '2026-09-01' AND '2026-09-15'
```

**Result:**
```
totalEntradas: 1500.00
totalSaidas: 5000.00
saldoLiquido: -3500.00
```

### Query 3: Lucro Líquido Integrado

```sql
-- Demonstração: como seria implementado no backend
-- ou como o frontend combina os dados

DECLARE @clinicaId UUID = '123e4567-e89b-12d3-a456-426614174000';
DECLARE @mes INT = MONTH(CURRENT_DATE);
DECLARE @ano INT = YEAR(CURRENT_DATE);

-- Receita de agendamentos
SELECT 
  'FATURAMENTO' as fonte,
  SUM(valor_servico) as valor
FROM agendamentos
WHERE 
  clinica_id = @clinicaId
  AND status = 'REALIZADO'
  AND MONTH(data_agendamento) = @mes
  AND YEAR(data_agendamento) = @ano

UNION ALL

-- Despesas manuais
SELECT 
  'DESPESAS' as fonte,
  SUM(valor) as valor
FROM lancamentos_financeiros
WHERE 
  clinica_id = @clinicaId
  AND tipo = 'DESPESA'
  AND MONTH(data) = @mes
  AND YEAR(data) = @ano
```

---

## Performance & Caching

### Recomendações

1. **Cache com TTL de 5 minutos**
   - Endpoint `/dashboard/metricas-operacionais`
   - Endpoint `/clinicas/financeiro/resumo`
   - Key: `dashboard:metrics:{clinicaId}:{mes}:{ano}`

2. **Índices Database**
   ```sql
   CREATE INDEX idx_agendamentos_status_data 
   ON agendamentos(clinica_id, status, data_agendamento);
   
   CREATE INDEX idx_lancamentos_data 
   ON lancamentos_financeiros(clinica_id, data, tipo);
   ```

3. **Query Optimization**
   - Use materialized views se houver >100k registros
   - Considerar agregações pré-calculadas por dia

---

## Error Handling

### Frontend Esperado

```typescript
// Se endpoint falha, retorna 0 (não quebra dashboard)
try {
  const resumo = await apiClient.getResumoFinanceiro(inicio, fim)
  return resumo
} catch (error) {
  console.error('Erro ao buscar resumo:', error)
  return { totalEntradas: 0, totalSaidas: 0, saldoLiquido: 0 }
}
```

### Backend Esperado

**Respostas válidas:**
- ✅ 200 OK: Dados encontrados
- ✅ 204 No Content: Nenhum lançamento no período
- ⚠️ 400 Bad Request: Parâmeteros inválidos
- ❌ 401 Unauthorized: Sem permissão
- ❌ 500 Internal Server Error: Erro no servidor

**Exemplo 204:**
```json
{
  "totalEntradas": 0,
  "totalSaidas": 0,
  "saldoLiquido": 0
}
```

---

## Próximas Fases

### Fase 2: Relatórios Avançados
- [ ] Endpoint `/clinicas/financeiro/relatorio` (PDF/CSV export)
- [ ] Filtros por categoria, período, etc
- [ ] Total de receitas/despesas por categoria

### Fase 3: Previsões
- [ ] Endpoint `/dashboard/projecao` (projeção de lucro)
- [ ] Tendências base em histórico

### Fase 4: Integração Agendamento
- [ ] Auto-criar lançamento quando agendamento → REALIZADO
- [ ] Endpoint `/agendamentos/{id}/finalizar` que cria lançamento

---

## Checklist de Implementação Backend

- [ ] Tabela `agendamentos` com coluna `valor_servico`
- [ ] Tabela `lancamentos_financeiros` criada
- [ ] Endpoint GET `/dashboard/metricas-operacionais` implementado
- [ ] Endpoint GET `/clinicas/financeiro/resumo` implementado
- [ ] Filtros por data funcionando
- [ ] Autenticação/autorização validando
- [ ] Cache implementado (5 minutos)
- [ ] Índices criados para performance
- [ ] Testes unitários para queries
- [ ] Documentação de API atualizada