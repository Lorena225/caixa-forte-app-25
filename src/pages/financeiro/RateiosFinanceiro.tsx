import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, SplitSquareHorizontal, Loader2, Check, AlertTriangle } from 'lucide-react';
import { useTransactions, useTransactionAllocations, useSetAllocations } from '@/hooks/useFinanceModule';
import { useCostCenters } from '@/hooks/useCompanyData';
import { useProjects } from '@/hooks/useProjects';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type Line = { cost_center_id: string; project_id: string; percentage: number };

export default function RateiosFinanceiro() {
  const { data: titulos = [], isLoading } = useTransactions('saida');
  const { data: costCenters = [] } = useCostCenters();
  const { data: projects = [] } = useProjects({ status: 'todos', search: '' });
  const [selectedId, setSelectedId] = useState<string>('');
  const { data: existing = [] } = useTransactionAllocations(selectedId || null);
  const setAllocations = useSetAllocations();

  const selected = titulos.find((t: any) => t.id === selectedId);
  const total = Number(selected?.total_amount ?? 0);
  const [lines, setLines] = useState<Line[]>([]);

  // carrega rateio existente ao selecionar
  useMemo(() => {
    if (existing.length > 0) {
      setLines(existing.map((e: any) => ({
        cost_center_id: e.cost_center_id ?? '', project_id: e.project_id ?? '', percentage: Number(e.percentage),
      })));
    } else if (selectedId) {
      setLines([{ cost_center_id: '', project_id: '', percentage: 100 }]);
    }
  }, [existing, selectedId]);

  const sumPct = lines.reduce((s, l) => s + (Number(l.percentage) || 0), 0);
  const isValid = Math.round(sumPct * 100) / 100 === 100;

  const addLine = () => setLines([...lines, { cost_center_id: '', project_id: '', percentage: 0 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = () => {
    if (!selectedId || !isValid) return;
    setAllocations.mutate({
      transactionId: selectedId,
      allocations: lines.map((l) => ({
        cost_center_id: l.cost_center_id || undefined,
        project_id: l.project_id || undefined,
        percentage: Number(l.percentage),
      })),
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Rateios"
          description="Distribua um título de saída entre centros de custo e projetos — alimenta a margem real por projeto" />

        <Card>
          <CardContent className="pt-6">
            <Label>Título de saída a ratear</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Selecione um título" /></SelectTrigger>
              <SelectContent>
                {titulos.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.description} · {formatCurrency(Number(t.total_amount))} · {t.counterparty?.name ?? 's/ fornecedor'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoading && <p className="text-sm text-muted-foreground mt-2">Carregando títulos…</p>}
            {!isLoading && titulos.length === 0 && <p className="text-sm text-muted-foreground mt-2">Nenhum título de saída cadastrado ainda.</p>}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader><CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2"><SplitSquareHorizontal className="h-4 w-4" />Distribuição</span>
              <span className="text-sm font-normal">Total: {formatCurrency(total)}</span>
            </CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_90px_90px_40px] gap-2 items-end">
                  <div>
                    <Label className="text-xs">Centro de custo</Label>
                    <Select value={l.cost_center_id} onValueChange={(v) => updateLine(i, { cost_center_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{costCenters.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Projeto</Label>
                    <Select value={l.project_id} onValueChange={(v) => updateLine(i, { project_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">%</Label>
                    <Input className="h-9" type="number" min="0" max="100" value={l.percentage}
                      onChange={(e) => updateLine(i, { percentage: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Valor</Label>
                    <div className="h-9 flex items-center text-sm font-mono">{formatCurrency(total * l.percentage / 100)}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-9" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                    <Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}

              <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Adicionar linha</Button>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className={cn('text-sm font-medium', isValid ? 'text-emerald-600' : 'text-red-600')}>
                  Soma: {sumPct.toFixed(2)}% {isValid ? '✓' : '(precisa ser 100%)'}
                </span>
                <Button onClick={save} disabled={!isValid || setAllocations.isPending}>
                  {setAllocations.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Salvar rateio
                </Button>
              </div>

              {!isValid && (
                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" />
                  <AlertDescription>A soma dos percentuais deve ser exatamente 100% para salvar o rateio.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
