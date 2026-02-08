
# CRM & Vendas 4.0 - Sistema Lead-to-Cash Integrado

## Resumo Executivo
Este plano descreve a construção completa do módulo CRM & Vendas 4.0, um sistema Lead-to-Cash totalmente integrado, multi-moeda e multi-canal. O módulo expande significativamente a infraestrutura existente de CRM.

---

## 1. Situacao Atual vs. Requisitos

### O que ja existe
- Tabelas base: `crm_pipelines`, `crm_stages`, `opportunities`, `quotes`, `quote_items`, `leads`, `sellers`
- Tabelas CPQ: `price_books`, `price_book_items` com campos fiscais
- Tabelas de suporte: `sales_territories`, `sales_teams`, `sales_team_members`, `commissions`, `commission_rules`
- Tabelas de Inbox: `crm_inbox_channels`, `crm_inbox_conversations`, `crm_inbox_messages`
- Hooks funcionais: `useCRM.ts` com operacoes CRUD
- UI basica: Kanban, Leads, Metas, Comissoes

### Lacunas Identificadas
1. **Indices de performance** em `close_date`, `amount`, `owner_id` nao existem
2. **Triggers de automacao Won** nao implementados
3. **Funcao de Aprovacao de Desconto** ausente
4. **RLS hierarquico** (Vendedor -> Gerente -> Diretor) nao configurado
5. **Cockpit do Vendedor** nao existe
6. **Motor CPQ com calculo fiscal** nao integrado na UI
7. **Timeline Omnichannel** nao renderiza mensagens do Inbox

---

## 2. Arquitetura de Banco de Dados

### 2.1 Novos Indices para Performance
```text
opportunities:
  - idx_opportunities_close_date (company_id, expected_close_date DESC)
  - idx_opportunities_amount (company_id, amount DESC)
  - idx_opportunities_owner (owner_id) [ja existe]

quotes:
  - idx_quotes_status_approval (company_id, status, approval_status)
  - idx_quotes_valid_until (valid_until)
```

### 2.2 Novas Colunas em Tabelas Existentes
**opportunities:**
- `currency_code` (text, default 'BRL')
- `exchange_rate` (numeric, default 1)
- `amount_converted` (numeric) - valor em moeda base

**sellers:**
- `max_discount_percent` (numeric, default 10)
- `hierarchy_level` (text: 'seller', 'team_leader', 'manager', 'director')

### 2.3 Nova Tabela: seller_territories
```text
seller_territories
  - id (uuid, PK)
  - seller_id (FK -> sellers)
  - territory_id (FK -> sales_territories)
  - is_primary (boolean)
  - created_at
```

---

## 3. Regras de Negocio (Database Functions)

### 3.1 Funcao de Validacao de Desconto
```text
check_quote_discount_approval(quote_id uuid)
RETURNS void

Logica:
1. Obtem discount_percent da quote
2. Obtem max_discount_percent do seller (via opportunity.seller_id)
3. Se discount > max_allowed:
   - UPDATE quotes SET requires_approval = true, approval_status = 'pending'
   - INSERT notificacao para manager_id do seller
4. Caso contrario: approval_status = 'auto_approved'
```

### 3.2 Trigger de Automacao Won
```text
FUNCTION trigger_opportunity_won()
TRIGGER: AFTER UPDATE ON opportunities
WHEN: NEW.status = 'won' AND OLD.status != 'won'

Acoes baseadas em crm_pipelines config:
1. Se won_create_order = true:
   - INSERT INTO sales_orders (...)
   - UPDATE opportunities SET converted_order_id = new_order.id

2. Se won_create_cashflow = true:
   - INSERT INTO transactions (tipo='receita', status='lancado')

3. Se won_create_stock_order = true:
   - INSERT INTO inventory_reservations para cada item da quote aceita

4. Se won_create_project = true:
   - INSERT INTO projects usando template won_project_template_id
```

### 3.3 Funcao de Calculo Fiscal CPQ
```text
calculate_quote_item_taxes(
  product_id uuid,
  quantity numeric,
  unit_price numeric,
  company_id uuid,
  counterparty_id uuid
)
RETURNS jsonb (icms, icms_st, ipi, pis, cofins, total)

Logica:
1. Busca NCM do produto
2. Busca tax_rules aplicaveis para NCM + UF destino
3. Calcula cada imposto
4. Retorna breakdown completo
```

### 3.4 Funcao de Hierarquia RLS
```text
can_view_opportunity(opp_id uuid)
RETURNS boolean
SECURITY DEFINER

Logica:
1. Se user eh 'director' -> true (ve tudo)
2. Se user eh 'manager' -> ve oportunidades do seu team
3. Se user eh 'team_leader' -> ve sua equipe
4. Se user eh 'seller' -> apenas suas proprias
```

---

## 4. Politicas RLS Hierarquicas

### Oportunidades
```text
Policy "opportunities_hierarchical_select":
  FOR SELECT USING (
    public.can_view_opportunity(id)
  )

Policy "opportunities_seller_modify":
  FOR UPDATE/DELETE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
```

### Quotes
```text
Policy "quotes_hierarchical_access":
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_id
      AND public.can_view_opportunity(o.id)
    )
  )
```

---

## 5. Interface de Alta Performance

### 5.1 Kanban Board Aprimorado
**Arquivo:** `src/pages/crm/Pipeline.tsx`

Melhorias:
- Header de coluna com: Total R$ + Total Ponderado (Valor x Probabilidade%)
- Indicador visual de "rotting" (oportunidades paradas)
- Filtros por vendedor, periodo, pipeline
- Drag-and-drop fluido (ja existe, aprimorar feedback visual)

### 5.2 Cockpit do Vendedor (Nova Pagina)
**Arquivo:** `src/pages/crm/SellerCockpit.tsx`
**Rota:** `/crm/meu-painel`

Componentes:
```text
+------------------------------------------+
| COCKPIT DO VENDEDOR - [Nome]             |
+------------------------------------------+
| [Velocimetro]  | Meta:    R$ 150.000     |
| 67%            | Realizado: R$ 100.500   |
|                | Gap:       R$ 49.500    |
+----------------+-------------------------+
| PROXIMAS TAREFAS          | OPORTUNIDADES HOT
| - Ligar Cliente X (hoje)  | - Deal ABC (R$50k)
| - Reuniao Y (amanha)      | - Deal XYZ (R$30k)
+---------------------------+---------------+
| PIPELINE RESUMIDO (mini-kanban)          |
+------------------------------------------+
```

### 5.3 CPQ Builder (Nova Pagina)
**Arquivo:** `src/pages/crm/QuoteBuilder.tsx`
**Rota:** `/crm/proposta/:opportunityId`

Features:
- Selecao de Price Book
- Adicao de produtos com preco automatico
- Calculo fiscal em tempo real
- Preview de impostos: Base + IPI + ICMS ST = Total
- Validacao de desconto maximo
- Geracao de PDF

### 5.4 Timeline Omnichannel
**Arquivo:** `src/components/crm/OmnichannelTimeline.tsx`

Integracao:
- E-mails (crm_activities type='email')
- WhatsApp (crm_inbox_messages via conversation_id)
- Notas (crm_activities type='note')
- Logs de sistema (crm_activities type='system')

Visualizacao cronologica unificada com icones por canal.

---

## 6. Hooks e Services

### 6.1 Novos Hooks
```text
useQuoteBuilder(opportunityId)
  - createQuote, addItem, removeItem, updateItem
  - calculateTaxes (chama funcao do banco)
  - submitForApproval

useSellerCockpit(sellerId)
  - currentGoal, achieved, gap
  - upcomingTasks
  - hotOpportunities
  - pipelineSummary

useOmnichannelTimeline(opportunityId)
  - activities + inboxMessages merged
  - sorted by timestamp
```

### 6.2 Service de Calculo CPQ
**Arquivo:** `src/services/cpqService.ts`

```text
calculateItemTotal(item, taxRules)
calculateQuoteTotal(items[])
validateDiscount(quote, seller)
```

---

## 7. Estrutura de Arquivos

### Novos Arquivos
```text
src/pages/crm/
  - SellerCockpit.tsx (Cockpit do Vendedor)
  - QuoteBuilder.tsx (CPQ)
  - Territories.tsx (Gestao de Territorios)

src/components/crm/
  - OmnichannelTimeline.tsx
  - QuoteItemRow.tsx
  - TaxBreakdown.tsx
  - SellerSpeedometer.tsx
  - ApprovalBadge.tsx
  - PipelineMiniKanban.tsx

src/hooks/
  - useQuoteBuilder.ts
  - useSellerCockpit.ts
  - useOmnichannelTimeline.ts
  - useTaxCalculation.ts

src/services/
  - cpqService.ts
```

### Arquivos Modificados
```text
src/hooks/useCRM.ts
  - Adicionar mutations para hierarchy queries
  - Expandir useOpportunities com filtros avancados

src/pages/crm/Pipeline.tsx
  - Adicionar Total Ponderado no header
  - Adicionar indicador de rotting

src/components/crm/OpportunityDetailModal.tsx
  - Integrar OmnichannelTimeline
  - Adicionar botao "Nova Proposta CPQ"
```

---

## 8. Migracao SQL Consolidada

A migracao sera executada em uma unica transacao com:

1. **Indices de performance**
2. **Novas colunas** (currency, hierarchy)
3. **Tabela seller_territories**
4. **Funcao check_quote_discount_approval**
5. **Funcao trigger_opportunity_won + TRIGGER**
6. **Funcao calculate_quote_item_taxes**
7. **Funcao can_view_opportunity (SECURITY DEFINER)**
8. **Atualizacao de RLS policies**

---

## 9. Fluxo de Implementacao

### Fase 1: Infraestrutura (Database)
1. Executar migracao SQL completa
2. Validar indices e funcoes criadas

### Fase 2: Backend Hooks
3. Implementar useQuoteBuilder
4. Implementar useSellerCockpit
5. Implementar useOmnichannelTimeline
6. Expandir useCRM.ts

### Fase 3: UI Core
7. Construir QuoteBuilder (CPQ)
8. Construir SellerCockpit
9. Construir OmnichannelTimeline

### Fase 4: Integracao
10. Atualizar Pipeline com Total Ponderado
11. Integrar CPQ no OpportunityDetailModal
12. Integrar Timeline no modal de oportunidade

### Fase 5: Navegacao
13. Adicionar rotas no App.tsx
14. Atualizar sidebar com novos itens

---

## 10. Consideracoes de Seguranca

### RLS Hierarquico
- Todas as funcoes de hierarquia usam SECURITY DEFINER
- SET search_path = public para prevenir injecao
- Validacao dupla: company_id + hierarchy_level

### Aprovacao de Descontos
- Bloqueio hard no banco (requires_approval = true)
- PDF/envio bloqueado ate approval_status = 'approved'
- Log de auditoria para todas as aprovacoes

### Multi-Tenant
- Todas as queries filtram por company_id
- Triggers validam company_id antes de criar registros relacionados

---

## 11. Diagrama de Fluxo Lead-to-Cash

```text
  +-------+     +-------------+     +-------+     +-------+
  | LEAD  | --> | OPPORTUNITY | --> | QUOTE | --> | ORDER |
  +-------+     +-------------+     +-------+     +-------+
      |               |                 |             |
      |               |                 v             v
      |               |           [CPQ Engine]   [Estoque]
      |               |           [Tax Calc]     [Reserva]
      |               v                 |             |
      |         [Won Trigger]           v             v
      |               |           [Aprovacao]    [Financeiro]
      |               |                 |             |
      |               +-----------------+-------------+
      |                         |
      v                         v
  [Timeline]              [Comissao]
  [Omnichannel]           [Calculo]
```

---

## Proximos Passos Apos Aprovacao

1. Criar migracao SQL com todos os elementos de banco
2. Implementar hooks na sequencia definida
3. Construir componentes UI
4. Integrar e testar fluxos completos
5. Adicionar navegacao

Este plano cobre 100% dos requisitos solicitados para o modulo CRM & Vendas 4.0.
