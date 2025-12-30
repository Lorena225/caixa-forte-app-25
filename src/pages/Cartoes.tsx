import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallets, useAccounts, useCounterparties } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency } from '@/lib/formatters';
import { CreditCard, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function Cartoes() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: wallets = [] } = useWallets();
  const { data: accounts = [] } = useAccounts();
  const { data: counterparties = [] } = useCounterparties();
  
  const cards = wallets.filter(w => w.type === 'cartao');

  const { data: installmentPlans = [] } = useQuery({
    queryKey: ['installment_plans', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('installment_plans')
        .select(`
          *,
          wallets:wallet_id(name),
          accounts:account_id(name),
          counterparties:counterparty_id(name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    wallet_id: '',
    account_id: '',
    counterparty_id: '',
    description: '',
    total_amount: 0,
    installments: 1,
    first_due_date: '',
  });

  const createInstallmentPlan = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Create installment plan
      const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .insert({
          company_id: currentCompany?.id,
          wallet_id: data.wallet_id,
          account_id: data.account_id,
          counterparty_id: data.counterparty_id || null,
          description: data.description,
          total_amount: data.total_amount,
          installments: data.installments,
          first_due_date: data.first_due_date,
          direction: 'saida' as const,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create individual transactions for each installment
      const installmentValue = data.total_amount / data.installments;
      const transactions = [];
      
      for (let i = 0; i < data.installments; i++) {
        const dueDate = new Date(data.first_due_date);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        transactions.push({
          company_id: currentCompany?.id,
          transaction_date: data.first_due_date,
          due_date: dueDate.toISOString().split('T')[0],
          direction: 'saida' as const,
          account_id: data.account_id,
          wallet_id: data.wallet_id,
          counterparty_id: data.counterparty_id || null,
          description: `${data.description} (${i + 1}/${data.installments})`,
          original_amount: installmentValue,
          total_amount: installmentValue,
          status: 'lancado' as const,
          installment_plan_id: plan.id,
          installment_number: i + 1,
        });
      }

      const { error: txError } = await supabase.from('transactions').insert(transactions);
      if (txError) throw txError;

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment_plans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Parcelamento criado!', description: 'As parcelas foram geradas com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      wallet_id: '',
      account_id: '',
      counterparty_id: '',
      description: '',
      total_amount: 0,
      installments: 1,
      first_due_date: '',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          title="Cartões e Parcelamentos" 
          description="Gerencie compras parceladas"
          action={{ label: 'Novo Parcelamento', onClick: () => setDialogOpen(true) }}
        />

        {/* Cards Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(card => (
            <Card key={card.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-warning/10">
                    <CreditCard className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">{card.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Fecha dia {card.closing_day || '-'} | Vence dia {card.due_day || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {cards.length === 0 && (
            <Card className="md:col-span-3">
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhum cartão cadastrado. Vá em Cadastros → Contas/Cartões para adicionar.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Installment Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Parcelamentos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {installmentPlans.length > 0 ? (
              <div className="space-y-4">
                {installmentPlans.map((plan: any) => (
                  <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{plan.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.wallets?.name} • {plan.counterparties?.name || 'Sem fornecedor'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold value-negative">{formatCurrency(plan.total_amount)}</p>
                      <Badge variant="outline">{plan.installments}x de {formatCurrency(plan.total_amount / plan.installments)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum parcelamento ativo. Clique em "Novo Parcelamento" para começar.
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Parcelamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createInstallmentPlan.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Ex: Notebook Dell"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={formData.total_amount} 
                    onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="48"
                    value={formData.installments} 
                    onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) || 1 })} 
                    required 
                  />
                </div>
              </div>

              {formData.total_amount > 0 && formData.installments > 0 && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <span className="text-muted-foreground">Valor da parcela: </span>
                  <span className="font-semibold">{formatCurrency(formData.total_amount / formData.installments)}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Primeiro Vencimento</Label>
                <Input 
                  type="date" 
                  value={formData.first_due_date} 
                  onChange={(e) => setFormData({ ...formData, first_due_date: e.target.value })} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cartão</Label>
                  <Select value={formData.wallet_id} onValueChange={(v) => setFormData({ ...formData, wallet_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {cards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plano de Contas</Label>
                  <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => ['despesa', 'custo'].includes(a.category_type)).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fornecedor (opcional)</Label>
                <Select value={formData.counterparty_id || "__none__"} onValueChange={(v) => setFormData({ ...formData, counterparty_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {counterparties.filter(c => c.type !== 'cliente').map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createInstallmentPlan.isPending}>
                  {createInstallmentPlan.isPending ? 'Criando...' : 'Criar Parcelamento'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
