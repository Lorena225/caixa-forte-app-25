

# Plano de Implementação: Módulo PCP & Chão de Fábrica (Industrial)

## Diagnóstico Atual

O sistema já possui uma infraestrutura sólida com:
- Tabelas de produção configuradas (`industrial_boms`, `work_centers`, `routing_operations`, `production_orders`, etc.)
- Funções de banco de dados funcionais (`explode_bom`, `run_mrp_calculation`, `close_production_order`)
- Interface básica para as principais telas

**Gaps identificados:**
1. BOMs sem versionamento robusto e conversão de unidades
2. Interface de MRP sem conversão de sugestões em Pedidos de Compra com um clique
3. Apontamento com interface desktop (não otimizada para tablet)
4. Falta visualização hierárquica de árvore de produto
5. Falta painel Kanban de controle de OPs

---

## Fase 1: Aprimoramento do Schema de Banco de Dados

### 1.1 Melhorias na Tabela `industrial_boms`

Adicionar colunas para versionamento robusto:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `revision` | TEXT | Identificador da revisão (Rev. 01, Rev. 02) |
| `is_locked` | BOOLEAN | Impede edição quando ativo |
| `parent_bom_id` | UUID | Referência à versão anterior |

### 1.2 Melhorias na Tabela `bom_components`

Adicionar conversão de unidades:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `purchase_unit_id` | UUID | Unidade de compra (kg, caixa) |
| `consumption_unit_id` | UUID | Unidade de consumo (g, un) |
| `conversion_factor` | NUMERIC | Fator de conversão entre unidades |

### 1.3 Trigger para Proteção de BOM Ativa

```text
Regra de negócio:
- BOM com status='active' → is_locked=true
- Para alterar: criar nova revisão (cópia)
- Histórico de revisões mantido via parent_bom_id
```

---

## Fase 2: Função MRP Aprimorada

### 2.1 Nova Função: `convert_mrp_to_purchase_order`

```text
Entrada: mrp_requirement_id (UUID)
Processo:
  1. Validar se requirement_type = 'purchase'
  2. Criar registro em 'purchase_requisitions' com dados do MRP
  3. Atualizar status do MRP para 'converted'
  4. Registrar converted_to_id na tabela
Saída: ID da Requisição de Compra criada
```

### 2.2 Nova Função: `convert_mrp_to_production_order`

```text
Entrada: mrp_requirement_id (UUID)
Processo:
  1. Validar se requirement_type = 'production'
  2. Buscar BOM ativa do produto
  3. Criar OP com materiais e operações
  4. Atualizar status do MRP para 'converted'
Saída: ID da Ordem de Produção criada
```

### 2.3 Função Batch: Converter Múltiplas Sugestões

Para permitir conversão em lote com um clique.

---

## Fase 3: Interface Shop Floor (Tablet)

### 3.1 Nova Página: `/producao/chao-fabrica`

Tela otimizada para tablet com:

```text
┌──────────────────────────────────────────────────────────────┐
│  🏭 APONTAMENTO - CHÃO DE FÁBRICA          [Operador: João] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  OP-20260208-0001                                      │ │
│  │  Mesa Escritório Premium                               │ │
│  │  Qtd: 10 un | Operação: Montagem Final                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│            ┌────────────────────────────────┐               │
│            │         02:45:32               │               │
│            │        ⏱️ Tempo                 │               │
│            └────────────────────────────────┘               │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │          │  │          │  │          │  │          │    │
│  │  ▶️ INICIAR │  │ ⏸️ PAUSAR │  │ ⏹️ PARAR  │  │ ❌ REFUGO│    │
│  │          │  │          │  │          │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  Motivo da Pausa: [▼ Selecione                          ]   │
│  - Aguardando material                                       │
│  - Manutenção                                                │
│  - Troca de turno                                            │
│  - Intervalo                                                 │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Qtd Produzida   │  │ Qtd Refugo      │                   │
│  │ [     5      ]  │  │ [     0      ]  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Características:
- Botões grandes para toque (min 48x48px)
- Fonte aumentada (18px+)
- Cores contrastantes
- Feedback visual claro
- Timer em tempo real
- Lista de motivos de pausa pré-definidos

---

## Fase 4: Visualização Hierárquica de BOM

### 4.1 Componente: `BOMTreeView`

Árvore expansível mostrando estrutura multinível:

```text
📦 Mesa Escritório Premium (v1.0)
├── 📦 Tampo MDF Laminado (2 un)
│   ├── 🔧 Chapa MDF 18mm (0.8 m²)
│   └── 🔧 Laminado Melamínico (1 m²)
├── 📦 Estrutura Metálica (1 un)
│   ├── 🔧 Tubo Aço 40x40mm (4 m)
│   └── 🔧 Parafusos Sextavados (16 un)
└── 🔧 Kit Niveladores (4 un)

📦 = Fabricado (tem BOM)
🔧 = Comprado (Matéria-Prima)
```

### Funcionalidades:
- Expandir/colapsar níveis
- Mostrar quantidade total calculada
- Indicar disponibilidade em estoque
- Link para edição de componentes

---

## Fase 5: Painel Kanban de OPs

### 5.1 Nova Página: `/producao/kanban`

```text
┌─────────────────────────────────────────────────────────────────────┐
│  KANBAN - CONTROLE DE PRODUÇÃO                                      │
├───────────┬───────────┬───────────┬───────────┬───────────┬────────┤
│ PLANEJADA │ LIBERADA  │ EM PROD.  │ PAUSADA   │ CONCLUÍDA │        │
│    (5)    │    (3)    │    (2)    │    (1)    │    (8)    │        │
├───────────┼───────────┼───────────┼───────────┼───────────┼────────┤
│ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │        │
│ │OP-001 │ │ │OP-004 │ │ │OP-007 │ │ │OP-009 │ │ │OP-010 │ │        │
│ │Mesa   │→│ │Cadeira│→│ │Armário│→│ │Estante│→│ │Mesa P │ │        │
│ │10 un  │ │ │25 un  │ │ │5 un   │ │ │3 un   │ │ │10 un  │ │        │
│ │📅 15/02│ │ │📅 14/02│ │ │75%    │ │ │⚠️ Manut│ │ │✅ 100%│ │        │
│ └───────┘ │ └───────┘ │ └───────┘ │ └───────┘ │ └───────┘ │        │
│ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │           │ ┌───────┐ │        │
│ │OP-002 │ │ │OP-005 │ │ │OP-008 │ │           │ │OP-011 │ │        │
│ │...    │ │ │...    │ │ │...    │ │           │ │...    │ │        │
│ └───────┘ │ └───────┘ │ └───────┘ │           │ └───────┘ │        │
└───────────┴───────────┴───────────┴───────────┴───────────┴────────┘
```

### Funcionalidades:
- Drag and drop para mudar status
- Indicadores visuais de atraso
- Filtros por centro de trabalho, produto, data
- Atualização em tempo real

---

## Fase 6: Relatório MRP Aprimorado

### 6.1 Tela de MRP com Conversão em Um Clique

Adicionar à página existente:

| Ação | Tipo | Comportamento |
|------|------|---------------|
| **Criar RC** | Compra | Gera Requisição de Compra automaticamente |
| **Criar OP** | Produção | Gera Ordem de Produção com BOM vinculada |
| **Converter Todas** | Batch | Converte todas as sugestões pendentes |

Componente de alerta para itens críticos (lead time curto).

---

## Resumo de Arquivos

### Novos Arquivos a Criar:
1. `src/pages/producao/ChaoFabrica.tsx` - Interface tablet
2. `src/pages/producao/Kanban.tsx` - Painel Kanban
3. `src/components/producao/BOMTreeView.tsx` - Árvore de BOM
4. `src/components/producao/ProductionTimer.tsx` - Timer de apontamento
5. `src/components/producao/KanbanColumn.tsx` - Coluna do Kanban
6. `src/components/producao/KanbanCard.tsx` - Card de OP

### Arquivos a Modificar:
1. `src/pages/producao/MRP.tsx` - Adicionar conversão em um clique
2. `src/pages/producao/Engenharia.tsx` - Adicionar visualização de árvore
3. `src/pages/producao/Index.tsx` - Adicionar novos módulos
4. `src/hooks/usePCP.ts` - Novos hooks para conversão MRP
5. `src/App.tsx` - Novas rotas

### Migrações de Banco de Dados:
1. Alterações em `industrial_boms` (revision, is_locked)
2. Alterações em `bom_components` (conversão de unidades)
3. Novas funções: `convert_mrp_to_purchase_order`, `convert_mrp_to_production_order`
4. Trigger de proteção de BOM ativa

---

## Seção Técnica

### Estrutura do Banco de Dados Atualizada

```text
industrial_boms
├── id (PK)
├── company_id (FK)
├── product_id (FK)
├── version (TEXT) ─────────► "1.0", "1.1", "2.0"
├── revision (TEXT) ────────► "Rev. 01", "Rev. 02" [NOVO]
├── is_locked (BOOLEAN) ────► Impede edição quando ativo [NOVO]
├── parent_bom_id (FK) ─────► Referência à versão anterior [NOVO]
├── status (TEXT) ──────────► draft | active | obsolete
└── ...

bom_components
├── id (PK)
├── bom_id (FK)
├── component_product_id (FK)
├── quantity (NUMERIC)
├── purchase_unit_id (FK) ──► Unidade de compra [NOVO]
├── consumption_unit_id (FK)► Unidade de consumo [NOVO]
├── conversion_factor (NUM) ► Fator de conversão [NOVO]
└── scrap_rate (NUMERIC)
```

### Função de Conversão MRP → Pedido de Compra

```text
create_purchase_order_from_mrp(p_mrp_id UUID)
├── 1. Validar requirement_type = 'purchase'
├── 2. Buscar fornecedor preferencial (histórico)
├── 3. Inserir em purchase_requisitions
│   ├── product_id
│   ├── quantity = net_requirement
│   ├── required_date
│   └── estimated_unit_cost (custo médio do produto)
├── 4. Atualizar mrp_requirements
│   ├── status = 'converted'
│   └── converted_to_id = requisition.id
└── 5. Retornar requisition.id
```

### Trigger de Proteção de BOM

```text
BEFORE UPDATE ON industrial_boms
├── IF OLD.is_locked = TRUE AND NEW.status != 'obsolete' THEN
│   └── RAISE EXCEPTION 'BOM bloqueada para edição'
└── IF NEW.status = 'active' THEN
    └── SET NEW.is_locked = TRUE
```

### Componente React: Timer de Produção

```text
ProductionTimer
├── Props: appointmentId, startTime, status
├── State: elapsedSeconds, isRunning
├── useEffect: setInterval(1000ms) para atualizar
├── useEffect: sincronizar com servidor a cada 30s
└── Render: display HH:MM:SS formatado
```

### Performance: Índices Recomendados

```text
-- Índice para busca de BOMs ativas
CREATE INDEX idx_boms_product_active 
ON industrial_boms(product_id, status) 
WHERE status = 'active';

-- Índice para MRP por empresa e status
CREATE INDEX idx_mrp_company_status 
ON mrp_requirements(company_id, status, requirement_type);

-- Índice para OPs por centro de trabalho
CREATE INDEX idx_po_operations_workcenter 
ON production_order_operations(work_center_id, status);
```

