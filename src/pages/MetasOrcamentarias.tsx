import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBudgets, useRcIndicators } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { Target, TrendingUp, TrendingDown, Pencil, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Metas() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  
  const { data: budgets = [], isLoading: loadingBudgets } = useBudgets(year);
  const { data: indicators = [], isLoading: loadingIndicators } = useRcIndicators(year);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    month: 1,
    target_revenue: 0,
    target_expense: 0,
    target_profit: 0,
    target_margin: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        company_id: currentCompany?.id,
        year,
      };

      if (editingItem) {
        const { error } = await supabase.from('budgets').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('budgets').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDialogOpen(false);
      setEditingItem(null);
      resetForm();
      toast({ title: editingItem ? 'Meta atualizada!' : 'Meta criada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ month: 1, target_revenue: 0, target_expense: 0, target_profit: 0, target_margin: 0 });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      month: item.month,
      target_revenue: item.target_revenue || 0,
      target_expense: item.target_expense || 0,
      target_profit: item.target_profit || 0,
      target_margin: item.target_margin || 0,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  // Combine budgets with actual indicators
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const combinedData = months.map(m => {
    const budget = budgets.find(b => b.month === m);
    const actual = indicators.find(i => i.month === m);
    return {
      month: m,
      target_revenue: budget?.target_revenue || 0,
      target_expense: budget?.target_expense || 0,
      target_profit: budget?.target_profit || 0,
      target_margin: budget?.target_margin || 0,
      actual_revenue: actual?.receita_realizada || 0,
      actual_expense: actual?.despesa_realizada || 0,
      actual_profit: actual?.lucro_prejuizo || 0,
      actual_margin: actual?.lucratividade || 0,
      budget_id: budget?.id,
    };
  });

  const totals = combinedData.reduce((acc, row) => ({
    target_revenue: acc.target_revenue + Number(row.target_revenue),
    target_expense: acc.target_expense + Number(row.target_expense),
    actual_revenue: acc.actual_revenue + Number(row.actual_revenue),
    actual_expense: acc.actual_expense + Number(row.actual_expense),
  }), { target_revenue: 0, target_expense: 0, actual_revenue: 0, actual_expense: 0 });

  const revenueProgress = totals.target_revenue > 0 
    ? Math.min((totals.actual_revenue / totals.target_revenue) * 100, 100) 
    : 0;
  const expenseProgress = totals.target_expense > 0 
    ? Math.min((totals.actual_expense / totals.target_expense) * 100, 100) 
    : 0;

  const monthOptions = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Metas e Orçamento" description="Defina metas e acompanhe o desempenho">
          <div className="flex items-center gap-2">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" />Nova Meta</Button>
          </div>
        </PageHeader>

        {/* Progress Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Meta de Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Realizado: {formatCurrency(totals.actual_revenue)}</span>
                  <span>Meta: {formatCurrency(totals.target_revenue)}</span>
                </div>
                <Progress value={revenueProgress} className="h-3" />
                <p className="text-xs text-muted-foreground text-right">{revenueProgress.toFixed(1)}% da meta</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Limite de Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Realizado: {formatCurrency(totals.actual_expense)}</span>
                  <span>Limite: {formatCurrency(totals.target_expense)}</span>
                </div>
                <Progress 
                  value={expenseProgress} 
                  className={`h-3 ${expenseProgress > 100 ? '[&>div]:bg-destructive' : ''}`} 
                />
                <p className="text-xs text-muted-foreground text-right">
                  {expenseProgress.toFixed(1)}% do limite
                  {expenseProgress > 100 && <span className="text-destructive ml-1">(EXCEDIDO)</span>}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Table */}
        <Card>
          <CardHeader>
            <CardTitle>Metas x Realizado por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="text-right">Meta Receita</th>
                    <th className="text-right">Receita Real</th>
                    <th className="text-right">Meta Despesa</th>
                    <th className="text-right">Despesa Real</th>
                    <th className="text-right">Meta Lucro</th>
                    <th className="text-right">Lucro Real</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {combinedData.map((row) => (
                    <tr key={row.month}>
                      <td className="font-medium">{formatShortMonth(row.month)}</td>
                      <td className="text-right">{formatCurrency(row.target_revenue)}</td>
                      <td className={`text-right ${row.actual_revenue >= row.target_revenue ? 'value-positive' : 'text-warning'}`}>
                        {formatCurrency(row.actual_revenue)}
                      </td>
                      <td className="text-right">{formatCurrency(row.target_expense)}</td>
                      <td className={`text-right ${row.actual_expense <= row.target_expense ? 'value-positive' : 'value-negative'}`}>
                        {formatCurrency(row.actual_expense)}
                      </td>
                      <td className="text-right">{formatCurrency(row.target_profit)}</td>
                      <td className={`text-right font-semibold ${row.actual_profit >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {formatCurrency(row.actual_profit)}
                      </td>
                      <td>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            if (row.budget_id) {
                              const budget = budgets.find(b => b.id === row.budget_id);
                              if (budget) handleEdit(budget);
                            } else {
                              setFormData({ ...formData, month: row.month });
                              setDialogOpen(true);
                            }
                          }}
                        >
                          {row.budget_id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select 
                  value={formData.month.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
                  disabled={!!editingItem}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta Receita (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={formData.target_revenue} 
                    onChange={(e) => setFormData({ ...formData, target_revenue: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limite Despesa (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={formData.target_expense} 
                    onChange={(e) => setFormData({ ...formData, target_expense: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta Lucro (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.target_profit} 
                    onChange={(e) => setFormData({ ...formData, target_profit: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Margem (%)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.target_margin} 
                    onChange={(e) => setFormData({ ...formData, target_margin: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
