# 📋 Backend Implementation Checklist

**Para:** Equipe de Backend  
**De:** Frontend Team  
**Data:** 5 de Abril de 2026  
**Prioridade:** 🔴 CRÍTICA para MVP  

---

## 🎯 O que Você Precisa Fazer

Frontend está **100% pronto**. Agora precisamos dos backends endpoints.

---

## 🔗 Endpoint 1: Dashboard Métricas Operacionais

### GET `/dashboard/metricas-operacionais`

**Usado por:** Frontend hook `useDashboardMetrics()`  
**Localização:** `src/hooks/use-dashboard.ts`

**Parâmetros Query:**
```
GET /dashboard/metricas-operacionais?clinicaId=UUID&mes=2026-04
```

**Headers Esperados:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Resposta Esperada (200):**
```json
{
  "success": true,
  "data": {
    "faturamento_mensal": 15000.00,
    "no_show_taxa": 8.5,
    "total_atendimentos": 48,
    "taxa_ocupacao": 92.3,
    "ticket_medio": 312.50
  }
}
```

**Campos Obrigatórios:**
- `faturamento_mensal` (number) - Soma de agendamentos REALIZADO
- `no_show_taxa` (number) - Percentual de no-shows
- `total_atendimentos` (number) - Quantidade total
- `taxa_ocupacao` (number) - Percentual de ocupação
- `ticket_medio` (number) - Média por atendimento

**Lógica Backend:**
```sql
-- faturamento_mensal
SELECT COALESCE(SUM(valor_cobrado), 0) as faturamento_mensal
FROM agendamentos
WHERE clinica_id = $1
  AND status = 'REALIZADO'
  AND DATE_TRUNC('month', data_agendamento) = DATE_TRUNC('month', CURRENT_DATE);

-- no_show_taxa
SELECT 
  ROUND(
    (COUNT(CASE WHEN status = 'NAO_COMPARECEU' THEN 1 END)::FLOAT / 
     NULLIF(COUNT(*), 0)) * 100, 
    1
  ) as no_show_taxa
FROM agendamentos
WHERE clinica_id = $1
  AND DATE_TRUNC('month', data_agendamento) = DATE_TRUNC('month', CURRENT_DATE);

-- total_atendimentos
SELECT COUNT(*) as total_atendimentos
FROM agendamentos
WHERE clinica_id = $1
  AND status = 'REALIZADO'
  AND DATE_TRUNC('month', data_agendamento) = DATE_TRUNC('month', CURRENT_DATE);
```

**Tratamento de Erro:**
```json
{
  "success": false,
  "error": "Clínica não encontrada",
  "code": "CLINIC_NOT_FOUND"
}
```

**Cache:**
- TTL: 5 minutos
- Key: `dashboard:metrics:{clinicaId}:{mes}`
- Invalidar: Quando novo agendamento REALIZADO criado

---

## 🔗 Endpoint 2: Resumo Financeiro Mensal

### GET `/clinicas/financeiro/resumo`

**Usado por:** Frontend hook `useResumoFinanceiroMes()`  
**Localização:** `src/hooks/use-dashboard.ts`

**Parâmetros Query:**
```
GET /clinicas/financeiro/resumo?clinicaId=UUID&dataInicio=2026-04-01&dataFim=2026-04-05
```

**Headers Esperados:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Resposta Esperada (200):**
```json
{
  "success": true,
  "data": {
    "totalEntradas": 15000.00,
    "totalSaidas": 2500.00,
    "saldoLiquido": 12500.00,
    "periodoInicio": "2026-04-01",
    "periodoFim": "2026-04-05"
  }
}
```

**Campos Obrigatórios:**
- `totalEntradas` (number) - Soma de todos lançamentos ENTRADA
- `totalSaidas` (number) - Soma de todos lançamentos SAÍDA/DESPESA
- `saldoLiquido` (number) - totalEntradas - totalSaidas
- `periodoInicio` (string ISO) - Data inicial do período
- `periodoFim` (string ISO) - Data final do período

**Lógica Backend:**
```sql
-- totalSaidas (CRÍTICO para verificação)
SELECT COALESCE(SUM(valor), 0) as totalSaidas
FROM lancamentos_financeiros
WHERE clinica_id = $1
  AND tipo = 'DESPESA'
  AND data_lancamento >= $2
  AND data_lancamento <= $3
  AND deletado_em IS NULL;

-- totalEntradas
SELECT COALESCE(SUM(valor), 0) as totalEntradas
FROM lancamentos_financeiros
WHERE clinica_id = $1
  AND tipo = 'ENTRADA'
  AND data_lancamento >= $2
  AND data_lancamento <= $3
  AND deletado_em IS NULL;
```

**Tratamento de Erro:**
```json
{
  "success": false,
  "error": "Período inválido",
  "code": "INVALID_PERIOD"
}
```

**Cache:**
- TTL: 5 minutos
- Key: `financeiro:resumo:{clinicaId}:{dataInicio}:{dataFim}`
- Invalidar: Quando novo lançamento criado

---

## ⚠️ VALIDAÇÕES CRÍTICAS

### ✅ Validação 1: Despesas NUNCA Ignoradas
```
TESTE:
- Criar agendamento com valor = R$ 10.000
- Marcar como REALIZADO
- Registrar despesa = R$ 2.500
- Dashboard deve exibir:
  Faturamento: 10.000
  Despesas: 2.500
  Lucro: 7.500
```

### ✅ Validação 2: Múltiplas Despesas Agregadas
```
TESTE:
- 3 despesas: R$ 500 + R$ 300 + R$ 400 = R$ 1.200
- Total de saídas deve ser R$ 1.200
- NÃO deve ser R$ 500 (apenas primeira)
```

### ✅ Validação 3: Período Correto
```
TESTE:
- Agendamento em 31/março com status REALIZADO
- Não deve aparecer no resumo de abril
- Datas devem usar: 01/mês até hoje (não calendário)
```

### ✅ Validação 4: Filtro por Clínica
```
TESTE:
- Clínica A: R$ 5.000
- Clínica B: R$ 8.000
- Pedir resumo de A: deve retornar R$ 5.000
- NÃO deve misturar dados de outras clínicas
```

---

## 📊 Diagrama de Fluxo de Dados

```
┌──────────────────────────────────────────────────────────────────┐
│                      Frontend Dashboard                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  useEffect(() => {                                               │
│    fetch('/dashboard/metricas-operacionais')  ──────┐            │
│    fetch('/clinicas/financeiro/resumo')       ──────┤            │
│  })                                                  │            │
│                                                     │            │
└──────────────────────────────────────────────────────┼───────────┘
                                                      │
                         ┌────────────────────────────┼────────────────────┐
                         │                            │                    │
                         ▼                            ▼                    ▼
                    ┌──────────────┐          ┌──────────────┐      ┌──────────┐
                    │  Agendamentos │          │  Lançamentos │      │  Cálculo │
                    │  REALIZADO    │          │  Financeiros │      │  Lucro   │
                    │               │          │              │      │          │
                    │ R$ 10.000     │          │ Saídas:      │      │ 10.000   │
                    │ (faturamento) │          │ R$ 2.500     │      │ - 2.500  │
                    └──────────────┘          │ (despesas)   │      │ ────     │
                                              │              │      │ 7.500 ✅ │
                                              └──────────────┘      └──────────┘
```

---

## 🔐 Segurança (IMPORTANTE!)

### Autenticação
- ✅ Todos endpoints devem validar token JWT
- ✅ Retornar 401 se token inválido
- ✅ Extrair clinicaId do token

### Autorização por Papel
```
DONO_CLINICA:  ✅ Vê valor completo de despesas
ADM_GERAL:     ✅ Vê valor completo de despesas
MEDICO:        ⛔ Não acessa /clinicas/financeiro/*
SECRETARIO:    ⛔ Não acessa /clinicas/financeiro/resumo
```

### Isolamento de Dados
- ✅ Nunca retornar dados de outras clínicas
- ✅ Validar clinicaId do usuário vs params
- ✅ Log de acessos não autorizados

---

## 🗄️ Estrutura de Banco de Dados

### Tabela: agendamentos
```sql
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES clinicas(id),
  status VARCHAR(50) NOT NULL DEFAULT 'AGENDADO',
    -- Values: 'AGENDADO', 'REALIZADO', 'NAO_COMPARECEU', 'CANCELADO'
  valor_cobrado DECIMAL(10, 2) NOT NULL,
  data_agendamento DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- ÍNDICES CRÍTICOS
  INDEX idx_clinica_status_data (clinica_id, status, data_agendamento),
  INDEX idx_clinica_mes (clinica_id, DATE_TRUNC('month', data_agendamento))
);
```

### Tabela: lancamentos_financeiros
```sql
CREATE TABLE lancamentos_financeiros (
  id UUID PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES clinicas(id),
  tipo VARCHAR(50) NOT NULL,
    -- Values: 'ENTRADA', 'SAÍDA', 'DESPESA'
  valor DECIMAL(10, 2) NOT NULL,
  categoria VARCHAR(100),
  descricao TEXT,
  data_lancamento DATE NOT NULL,
  deletado_em TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- ÍNDICES CRÍTICOS
  INDEX idx_clinica_tipo_data (clinica_id, tipo, data_lancamento),
  INDEX idx_clinica_periodo (clinica_id, data_lancamento)
);
```

---

## 📸 Teste Manual (Swagger/Postman)

### Teste 1: Faturamento Completo
```bash
# Cenário: Clínica teve R$ 15.000 em agendamentos realizados
GET http://localhost:3001/dashboard/metricas-operacionais?clinicaId=clinic-123&mes=2026-04

# Resposta Esperada:
{
  "success": true,
  "data": {
    "faturamento_mensal": 15000.00,
    "no_show_taxa": 5.0,
    "total_atendimentos": 50
  }
}
```

### Teste 2: Despesas Registradas
```bash
# Cenário: Foram registradas despesas de R$ 3.500
GET http://localhost:3001/clinicas/financeiro/resumo?clinicaId=clinic-123&dataInicio=2026-04-01&dataFim=2026-04-30

# Resposta Esperada:
{
  "success": true,
  "data": {
    "totalEntradas": 0,
    "totalSaidas": 3500.00,
    "saldoLiquido": -3500.00,
    "periodoInicio": "2026-04-01",
    "periodoFim": "2026-04-30"
  }
}
```

### Teste 3: Dashboard Integrado
```bash
# Cenário: Ambos endpoints consultados
# Frontend calcula:
faturamento = 15000.00       (do endpoint 1)
despesas = 3500.00           (do endpoint 2 totalSaidas)
lucroLiquido = 15000 - 3500 = 11500.00

# Dashboard deve exibir:
Faturamento: R$ 15.000
Despesas: R$ 3.500
Lucro Líquido: R$ 11.500 ✅
```

---

## 🚀 Deployment Order

```
1️⃣  Backend implementa endpoints
2️⃣  QA testa com Postman/Swagger
3️⃣  Frontend recebe URLs reais (trocar mock URLs)
4️⃣  Integration testing (Frontend + Backend)
5️⃣  Deploy para staging
6️⃣  Deploy para produção
```

---

## 📞 Contato & Suporte

**Issues/Dúvidas?**
- Verificar `FINANCIAL_INTEGRATION.md` para mais detalhas
- Verificar `API_SPECIFICATION.md` para especificação completa
- Executar `src/lib/utils/lucro-helper.test.ts` para validar cálculos

**Qualidade de Código:**
- ✅ Type safety (TypeScript strict)
- ✅ Error handling robustos
- ✅ Caching implementado
- ✅ Índices de DB otimizados

---

## ✅ Checklist Final

- [ ] Endpoint 1 implementado & testado
- [ ] Endpoint 2 implementado & testado
- [ ] Validações críticas passando
- [ ] Índices de banco criados
- [ ] Cache implementado
- [ ] Segurança validada
- [ ] Testes manuais completos
- [ ] URLs produção configuradas no frontend
- [ ] Pronto para staging
- [ ] Pronto para produção

---

**Status:** ⏳ Aguardando Backend Implementation  
**Tempo Estimado:** 2-3 dias úteis  
**Complexidade:** 🟡 Média (2 endpoints, SQL moderate)  

🚀 **Vamos lá! MVP quase completo!**