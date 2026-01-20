# Dashboard Executivo - Documentação

## Visão Geral

O Dashboard Executivo é a página principal do sistema ERP, fornecendo uma visão consolidada das métricas financeiras, alertas e projeções de fluxo de caixa.

## Arquitetura

```
src/
├── pages/
│   └── Dashboard.tsx           # Página principal
├── components/dashboard/
│   ├── KPICard.tsx             # Cards de KPI
│   ├── AlertsPanel.tsx         # Painel de alertas
│   └── CashFlowProjection.tsx  # Gráfico de projeção
├── hooks/
│   ├── useDashboardMetrics.ts  # Métricas principais
│   ├── useDashboardAlerts.ts   # Sistema de alertas
│   └── useDashboardFluxo.ts    # Projeção de fluxo
└── types/
    └── dashboard.ts            # Tipos TypeScript
```

## Como Adicionar um Novo KPI

### 1. Atualizar Types (`src/types/dashboard.ts`)

```typescript
export interface DashboardMetrics {
  // ... KPIs existentes
  novoKpi: KPICard;
}
```

### 2. Adicionar Cálculo no Hook (`src/hooks/useDashboardMetrics.ts`)

```typescript
// Dentro da queryFn:
const novoKpiValor = await calcularNovoKpi(companyId);

return {
  // ... outros KPIs
  novoKpi: {
    titulo: 'Novo KPI',
    valor: novoKpiValor,
    valorFormatado: formatCurrency(novoKpiValor),
    variacao: 0,
    variacaoLabel: 'do período',
    status: getStatus(novoKpiValor, 1000, 500, false),
    cor: getStatusColor(status),
    icon: IconeEscolhido,
  },
};
```

### 3. Renderizar no Dashboard (`src/pages/Dashboard.tsx`)

```tsx
<KPICard
  title="Novo KPI"
  value={metrics?.novoKpi?.valorFormatado || 'R$ 0'}
  icon={NovoIcone}
  variant={metrics?.novoKpi?.status || 'default'}
  onClick={() => navigate('/rota-detalhes')}
/>
```

## Como Customizar Cores e Temas

### Cores dos KPIs

As cores são definidas no arquivo `src/index.css`:

```css
:root {
  --success: 142 76% 36%;      /* Verde */
  --warning: 38 92% 50%;       /* Amarelo */
  --destructive: 0 84% 60%;    /* Vermelho */
}
```

### Variantes de KPI

Defina novas variantes em `src/components/dashboard/KPICard.tsx`:

```typescript
const variantStyles = {
  custom: {
    card: 'kpi-card-custom',
    icon: 'text-custom',
    value: 'text-custom',
  },
};
```

E adicione os estilos CSS:

```css
.kpi-card-custom {
  border-left: 4px solid hsl(var(--custom));
}
```

## Como Adicionar um Novo Tipo de Alerta

### 1. Definir Tipo de Alerta (`src/types/dashboard.ts`)

```typescript
export type AlertType = 
  | 'contas_receber_vencidas'
  | 'contas_pagar_vencidas'
  | 'fluxo_negativo'
  | 'novo_tipo_alerta'; // Adicione aqui
```

### 2. Implementar Detecção (`src/hooks/useDashboardAlerts.ts`)

```typescript
// Dentro da queryFn:

// Detectar nova condição
const { data: novaCondicao } = await supabase
  .from('tabela')
  .select('*')
  .eq('company_id', companyId)
  .eq('condicao', true);

if ((novaCondicao as any[])?.length > 0) {
  alerts.push({
    id: 'novo-alerta',
    tipo: 'novo_tipo_alerta',
    titulo: 'Título do Alerta',
    mensagem: 'Descrição detalhada',
    urgencia: 'media',
    actionLabel: 'Resolver',
    actionRoute: '/rota-para-resolver',
    createdAt: new Date(),
  });
}
```

### 3. Adicionar Ícone no Painel (`src/components/dashboard/AlertsPanel.tsx`)

```typescript
const alertIcons: Record<string, LucideIcon> = {
  // ... outros
  novo_tipo_alerta: NovoIcone,
};
```

## Performance Gotchas

### ⚠️ Evitar

1. **Queries sem limite**: Sempre use `.limit()` em queries grandes
2. **Re-renders desnecessários**: Use `React.memo()` em componentes pesados
3. **Cálculos no render**: Mova para `useMemo()`
4. **Múltiplas queries sequenciais**: Use `Promise.all()` para paralelizar

### ✅ Recomendado

```typescript
// Bom: Memoização de cálculos
const chartData = useMemo(() => {
  return data.map(item => ({
    ...item,
    formatted: formatCurrency(item.value),
  }));
}, [data]);

// Bom: Debounce de refresh
const debouncedRefresh = useMemo(
  () => debounce(handleRefresh, 5000),
  [handleRefresh]
);

// Bom: Lazy loading de gráficos
const LazyChart = lazy(() => import('./CashFlowProjection'));
```

### Cache Strategy

```typescript
// Configuração recomendada
{
  staleTime: 5 * 60 * 1000,  // 5 minutos
  gcTime: 10 * 60 * 1000,    // 10 minutos
}
```

## Troubleshooting

### Dashboard não carrega

1. Verifique se o usuário está autenticado
2. Verifique se `currentCompany` está definido
3. Cheque console para erros de RLS

```typescript
// Debug: Adicione temporariamente
console.log('Company ID:', currentCompany?.id);
console.log('User ID:', user?.id);
```

### Métricas incorretas

1. Verifique filtros de `status` nas queries
2. Confirme que `direction` está correto ('entrada'/'saida')
3. Verifique formato de datas (`yyyy-MM-dd`)

### Alertas não aparecem

1. Verifique se há dados que atendem às condições
2. Confirme que `maxAlerts` não está limitando demais
3. Cheque ordenação por urgência

### Performance lenta

1. Adicione índices no banco:
```sql
CREATE INDEX idx_transactions_company_status 
ON transactions(company_id, status);

CREATE INDEX idx_transactions_company_due_date 
ON transactions(company_id, due_date);
```

2. Aumente `staleTime` para reduzir refetches
3. Use `React.lazy()` para gráficos below the fold

## Checklist de Deploy

- [ ] Cache configurado corretamente
- [ ] Índices de banco criados
- [ ] RLS policies verificadas
- [ ] Testes passando
- [ ] Performance < 2s no LCP
- [ ] Responsivo mobile testado
- [ ] Dark mode funcionando
- [ ] Acessibilidade verificada (ARIA labels)

## Referências

- [React Query Docs](https://tanstack.com/query/latest)
- [Recharts Docs](https://recharts.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
