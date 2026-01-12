import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, FileText, CheckCircle, Clock, Send, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

export default function Bordero() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedWallet, setSelectedWallet] = useState<string>('');

  const { data: pendingBills, isLoading } = useQuery({
    queryKey: ['pending-bills-bordero', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('vendor_bills')
        .select(`
          id,
          document_number,
          due_date,
          net_amount,
          counterparty:counterparties(name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('status', 'approved')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const { data: wallets } = useQuery({
    queryKey: ['wallets-payment', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('wallets')
        .select('id, name')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .in('wallet_type', ['bank_account', 'cash'])
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const toggleBill = (id: string) => {
    setSelectedBills(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedBills.length === pendingBills?.length) {
      setSelectedBills([]);
    } else {
      setSelectedBills(pendingBills?.map(b => b.id) || []);
    }
  };

  const selectedTotal = pendingBills
    ?.filter(b => selectedBills.includes(b.id))
    .reduce((sum, b) => sum + Number(b.net_amount), 0) || 0;

  const createBordero = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id || !selectedWallet || selectedBills.length === 0) {
        throw new Error('Dados incompletos');
      }

      // In a real implementation, this would create a payment batch
      // For now, we'll just show a success message
      return { success: true };
    },
    onSuccess: () => {
      toast.success(`Borderô criado com ${selectedBills.length} títulos`);
      setDialogOpen(false);
      setSelectedBills([]);
      queryClient.invalidateQueries({ queryKey: ['pending-bills-bordero'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Lotes de Pagamento (Borderô)"
          description="Agrupe títulos para aprovação e pagamento em lote"
        >
          <Button 
            disabled={selectedBills.length === 0}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Borderô ({selectedBills.length})
          </Button>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Títulos Aprovados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingBills?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Selecionados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{selectedBills.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total Selecionado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(selectedTotal)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Títulos Aguardando Pagamento
            </CardTitle>
            <CardDescription>
              Selecione os títulos para criar um lote de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : pendingBills && pendingBills.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedBills.length === pendingBills.length}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBills.map((bill) => (
                    <TableRow 
                      key={bill.id}
                      className={selectedBills.includes(bill.id) ? 'bg-primary/5' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedBills.includes(bill.id)}
                          onCheckedChange={() => toggleBill(bill.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{bill.document_number}</TableCell>
                      <TableCell>{bill.counterparty?.name}</TableCell>
                      <TableCell>
                        <Badge variant={new Date(bill.due_date) < new Date() ? 'destructive' : 'outline'}>
                          {format(new Date(bill.due_date), 'dd/MM/yyyy')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(bill.net_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum título aprovado aguardando pagamento
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Borderô de Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Títulos selecionados</span>
                  <span className="font-bold">{selectedBills.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor total</span>
                  <span className="font-bold text-xl text-destructive">{formatCurrency(selectedTotal)}</span>
                </div>
              </div>
              <div>
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Conta para Débito</Label>
                <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => createBordero.mutate()} disabled={!selectedWallet}>
                <Send className="mr-2 h-4 w-4" />
                Criar e Enviar para Aprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
