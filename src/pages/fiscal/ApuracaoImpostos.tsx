import { useState } from 'react';
import { Calculator, Plus, TrendingUp, TrendingDown, DollarSign, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { useTaxCalculationSummary, useCreateTaxCalculation, useMarkTaxAsPaid, useTaxCalculations } from '@/hooks/useTaxCalculations';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TAX_TYPES = [
  { code: 'ICMS', name: 'ICMS', color: '#3b82f6' },
  { code: 'PIS', name: 'PIS', color: '#10b981' },
  { code: 'COFINS', name: 'COFINS', color: '#f59e0b' },
  { code: 'IPI', name: 'IPI', color: '#8b5cf6' },
  { code: 'ISS', name: 'ISS', color: '#ec4899' },
  { code: 'IRPJ', name: 'IRPJ', color: '#ef4444' },
  { code: 'CSLL', name: 'CSLL', color: '#06b6d4' },
];

export default function ApuracaoImpostos() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [formData, setFormData] = useState({
    tax_type: '',
    total_debits: 0,
    total_credits: 0,
    previous_balance: 0,
  });
  
  const { data: summary } = useTaxCalculationSummary(selectedYear, selectedMonth);
  const { data: allCalculations = [] } = useTaxCalculations();
  const createMutation = useCreateTaxCalculation();
  const markPaidMutation = useMarkTaxAsPaid();
  
  const handleCreateApuracao = () => {
    if (!formData.tax_type) return;
    
    createMutation.mutate({
      ...formData,
      tax_type: formData.tax_type as 'ICMS' | 'PIS' | 'COFINS' | 'IPI' | 'ISS' | 'IRPJ' | 'CSLL',
      period_year: selectedYear,
      period_month: selectedMonth,
    }, {
      onSuccess: () => setIsDialogOpen(false),
    });
  };
  
  const handleMarkPaid = (id: string) => {
    markPaidMutation.mutate({
      id,
      paymentDate: new Date().toISOString().split('T')[0],
    });
  };
  
  // Prepare chart data
  const chartData = TAX_TYPES.map(tax => {
    const calc = summary?.[tax.code];
    return {
      name: tax.code,
      debitos: calc?.total_debits || 0,
      creditos: calc?.total_credits || 0,
      saldo: calc?.balance || 0,
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'apurado':
        return <Badge variant="default">Apurado</Badge>;
      case 'compensado':
        return <Badge variant="secondary">Compensado</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apuração de Impostos"
        description="Apure e acompanhe os impostos da empresa"
      />

      {/* Period selector and total */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total a Pagar</p>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalAPagar || 0)}</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Apuração
          </Button>
        </div>
      </div>

      {/* Tax Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {TAX_TYPES.map((tax) => {
          const calc = summary?.[tax.code];
          const balance = calc?.balance || 0;
          
          return (
            <Card key={tax.code}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {tax.name}
                  {calc && getStatusBadge(calc.status)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calc ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Débitos
                      </span>
                      <span>{formatCurrency(calc.total_debits)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Créditos
                      </span>
                      <span>{formatCurrency(calc.total_credits)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Saldo
                      </span>
                      <span className={balance > 0 ? 'text-destructive' : 'text-green-600'}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    {calc.status === 'apurado' && balance > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleMarkPaid(calc.id)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Marcar como Pago
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Não apurado
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Comparativo de Impostos - {format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="debitos" name="Débitos" fill="#ef4444" />
                <Bar dataKey="creditos" name="Créditos" fill="#22c55e" />
                <Bar dataKey="saldo" name="Saldo" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Apuração de Imposto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Imposto</Label>
              <Select value={formData.tax_type} onValueChange={(v) => setFormData({ ...formData, tax_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o imposto" />
                </SelectTrigger>
                <SelectContent>
                  {TAX_TYPES.map(tax => (
                    <SelectItem key={tax.code} value={tax.code}>{tax.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Débitos</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_debits}
                  onChange={(e) => setFormData({ ...formData, total_debits: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Créditos</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_credits}
                  onChange={(e) => setFormData({ ...formData, total_credits: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Saldo Anterior (Credor)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.previous_balance}
                onChange={(e) => setFormData({ ...formData, previous_balance: Number(e.target.value) })}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between font-medium">
                <span>Saldo a Pagar:</span>
                <span className={formData.total_debits - formData.total_credits - formData.previous_balance > 0 ? 'text-destructive' : 'text-green-600'}>
                  {formatCurrency(formData.total_debits - formData.total_credits - formData.previous_balance)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateApuracao} disabled={!formData.tax_type || createMutation.isPending}>
              Criar Apuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
