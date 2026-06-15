import { useState } from 'react';
import { TrendingUp, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RevenueExpensesAreaChart } from '@/components/dashboard/RevenueExpensesAreaChart';
import { ExpensesByCategoryChart } from '@/components/dashboard/ExpensesByCategoryChart';

/**
 * Unifica os dois cards antes duplicados ("Receitas vs Despesas" e "Despesas
 * por Categoria") num único bloco com toggle. Responde a uma pergunta só —
 * "como entra e sai meu dinheiro?" — em dois cortes, sem ocupar dois espaços.
 */
interface Props {
  revenueData: any;
  revenueLoading: boolean;
  categoryData: any;
  categoryLoading: boolean;
}

type View = 'serie' | 'composicao';

export function RevenueExpensesPanel({ revenueData, revenueLoading, categoryData, categoryLoading }: Props) {
  const [view, setView] = useState<View>('serie');

  const tabs: { key: View; label: string; icon: any; color: string }[] = [
    { key: 'serie', label: 'Série', icon: TrendingUp, color: 'text-primary' },
    { key: 'composicao', label: 'Composição', icon: PieChart, color: 'text-purple-500' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('p-2 rounded-lg', view === 'serie' ? 'bg-primary/10' : 'bg-purple-500/10')}>
            {view === 'serie'
              ? <TrendingUp className="w-4 h-4 text-primary" />
              : <PieChart className="w-4 h-4 text-purple-500" />}
          </div>
          <h3 className="font-semibold text-foreground truncate">Receitas e Despesas</h3>
        </div>
        {/* toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5 shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = view === t.key;
            return (
              <button key={t.key} onClick={() => setView(t.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  active ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}>
                <Icon className={cn('w-3.5 h-3.5', active && t.color)} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-[250px]">
        {view === 'serie' ? (
          <RevenueExpensesAreaChart data={revenueData} isLoading={revenueLoading} className="h-full" />
        ) : (
          <ExpensesByCategoryChart data={categoryData} isLoading={categoryLoading} className="h-full" />
        )}
      </div>
    </div>
  );
}
