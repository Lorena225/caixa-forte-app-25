import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Clock, AlertTriangle, CheckCircle, Send, Download, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import BaixaManualAR from './BaixaManualAR';
import BaixaAutomaticaAR from './BaixaAutomaticaAR';

export default function ARIndex() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [mainTab, setMainTab] = useState('titulos');
  
  const [formData, setFormData] = useState({
    counterparty_id: '',
    document_type: 'nf',
    document_number: '',
    document_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    total_amount: '',
    notes: ''
  });

  // Fetch customer invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['customer-invoices', currentCompany?.id, activeTab],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('customer_invoices')
        .select(`
          *,
          counterparty:counterparties(name)
        `)
        .eq('company_id', currentCompany.id)
        .order('due_date', { ascending: true });
      
      if (activeTab === 'pending') {
        query = query.in('status', ['pending', 'partial']);
      } else if (activeTab === 'paid') {
        query = query.eq('status', 'paid');
      } else if (activeTab === 'overdue') {
        query = query.eq('status', 'overdue');
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  // Fetch counterparties (customers only)
  const { data: customers } = useQuery({
    queryKey: ['customers', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('counterparties')
        .select('id, name')
        .eq('company_id', currentCompany.id)
        .eq('is_client', true)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  // Fetch aging summary
  const { data: agingSummary } = useQuery({
    queryKey: ['ar-aging-summary', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('v_ar_aging_detail')
        .select('aging_bucket, net_amount')
        .eq('company_id', currentCompany.id);
      
      if (error) throw error;
      
      const summary = {
        a_vencer: 0,
        '1_30': 0,
        '31_60': 0,
        '61_90': 0,
        '90_plus': 0,
        total: 0
      };
      
      (data || []).forEach(row => {
        const bucket = row.aging_bucket as keyof typeof summary;
        summary[bucket] = (summary[bucket] || 0) + Number(row.net_amount);
        summary.total += Number(row.net_amount);
      });
      
      return summary;
    },
    enabled: !!currentCompany?.id
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { error } = await supabase
        .from('customer_invoices')
        .insert({
          company_id: currentCompany.id,
          counterparty_id: formData.counterparty_id,
          document_type: formData.document_type,
          document_number: formData.document_number,
          document_date: formData.document_date,
          due_date: formData.due_date,
          total_amount: parseFloat(formData.total_amount),
          net_amount: parseFloat(formData.total_amount),
          status: 'pending',
          notes: formData.notes
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging-summary'] });
      setIsDialogOpen(false);
      setFormData({
        counterparty_id: '',
        document_type: 'nf',
        document_number: '',
        document_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: '',
        total_amount: '',
        notes: ''
      });
      toast.success('Fatura criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      pending: 'bg-warning/10 text-warning',
      partial: 'bg-primary/10 text-primary',
      paid: 'bg-success/10 text-success',
      overdue: 'bg-destructive/10 text-destructive',
      cancelled: 'bg-muted text-muted-foreground',
      written_off: 'bg-destructive/10 text-destructive'
    };
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      pending: 'Pendente',
      partial: 'Parcial',
      paid: 'Recebido',
      overdue: 'Vencido',
      cancelled: 'Cancelado',
      written_off: 'Baixado'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getCollectionBadge = (status: string) => {
    if (status === 'none') return null;
    const styles: Record<string, string> = {
      scheduled: 'bg-info/10 text-info',
      sent: 'bg-primary/10 text-primary',
      negotiating: 'bg-warning/10 text-warning',
      legal: 'bg-destructive/10 text-destructive'
    };
    const labels: Record<string, string> = {
      scheduled: 'Agendada',
      sent: 'Enviada',
      negotiating: 'Negociando',
      legal: 'Jurídico'
    };
    return <Badge variant="outline" className={styles[status]}>{labels[status]}</Badge>;
  };

  if (isLoading && mainTab === 'titulos') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="Contas a Receber (AR)"
          description="Gestão de faturas, recebimentos e baixas de clientes"
        >
          <div className="flex gap-2">
            <Button variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Cobrança em Massa
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Fatura
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nova Fatura a Receber</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Cliente</Label>
                      <Select
                        value={formData.counterparty_id}
                        onValueChange={(v) => setFormData({ ...formData, counterparty_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de Documento</Label>
                      <Select
                        value={formData.document_type}
                        onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nf">Nota Fiscal</SelectItem>
                          <SelectItem value="nfe">NF-e</SelectItem>
                          <SelectItem value="nfse">NFS-e</SelectItem>
                          <SelectItem value="fatura">Fatura</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="contrato">Contrato</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <Label>Número do Documento</Label>
                      <Input
                        value={formData.document_number}
                        onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                        placeholder="Ex: 12345"
                      />
                    </div>
                    <div>
                      <Label>Data do Documento</Label>
                      <Input
                        type="date"
                        value={formData.document_date}
                        onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Data de Vencimento</Label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Valor Total</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createMutation.mutate()}
                      disabled={!formData.counterparty_id || !formData.document_number || !formData.due_date || !formData.total_amount}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </PageHeader>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="titulos" className="gap-2">
              <FileText className="h-4 w-4" />
              Títulos
            </TabsTrigger>
            <TabsTrigger value="baixa-manual" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Baixa Manual
            </TabsTrigger>
            <TabsTrigger value="baixa-automatica" className="gap-2">
              <Download className="h-4 w-4" />
              Baixa Automática
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Títulos Tab */}
          <TabsContent value="titulos" className="space-y-6">
            {/* Aging Summary — cards com border-left e total */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Total a Receber', value: agingSummary?.total || 0, border: 'border-l-primary', text: 'text-primary', icon: <FileText className="h-4 w-4 text-primary" /> },
                { label: 'A Vencer', value: agingSummary?.a_vencer || 0, border: 'border-l-success', text: 'text-success', icon: <CheckCircle className="h-4 w-4 text-success" /> },
                { label: '1–30 dias', value: agingSummary?.['1_30'] || 0, border: 'border-l-warning', text: 'text-warning', icon: <Clock className="h-4 w-4 text-warning" /> },
                { label: '31–60 dias', value: agingSummary?.['31_60'] || 0, border: 'border-l-warning', text: 'text-warning', icon: <Clock className="h-4 w-4 text-warning" /> },
                { label: '61–90 dias', value: agingSummary?.['61_90'] || 0, border: 'border-l-destructive', text: 'text-destructive', icon: <AlertTriangle className="h-4 w-4 text-destructive" /> },
                { label: '+90 dias', value: agingSummary?.['90_plus'] || 0, border: 'border-l-destructive', text: 'text-destructive', icon: <AlertTriangle className="h-4 w-4 text-destructive" /> },
              ].map((item) => (
                <Card key={item.label} className={`border-l-4 ${item.border} min-h-[80px]`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      {item.icon}
                      <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                    </div>
                    <p className={`text-base font-bold font-mono ${item.text}`}>
                      {formatCurrency(item.value)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="border-b pb-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-0">
                    <TabsTrigger value="pending" className="gap-2">
                      <Clock className="h-4 w-4" /> Pendentes
                    </TabsTrigger>
                    <TabsTrigger value="overdue" className="gap-2 data-[state=active]:text-destructive">
                      <AlertTriangle className="h-4 w-4" /> Vencidos
                    </TabsTrigger>
                    <TabsTrigger value="paid" className="gap-2">
                      <CheckCircle className="h-4 w-4" /> Recebidos
                    </TabsTrigger>
                    <TabsTrigger value="all" className="gap-2">
                      <FileText className="h-4 w-4" /> Todos
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                {invoices && invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="pl-4">Documento</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right pr-4">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Cobrança</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => {
                          const overdue = invoice.status === 'overdue' ||
                            (new Date(invoice.due_date) < new Date() && !['paid','cancelled','written_off'].includes(invoice.status));
                          return (
                            <TableRow
                              key={invoice.id}
                              className={overdue ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/20'}
                            >
                              <TableCell className="pl-4">
                                <span className="font-mono text-sm">{invoice.document_number}</span>
                                <p className="text-xs text-muted-foreground uppercase">{invoice.document_type}</p>
                              </TableCell>
                              <TableCell className="text-sm">{invoice.counterparty?.name || '—'}</TableCell>
                              <TableCell className={`text-sm ${overdue ? 'text-destructive font-medium' : ''}`}>
                                {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium pr-4">
                                {formatCurrency(invoice.net_amount)}
                              </TableCell>
                              <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                              <TableCell>{getCollectionBadge(invoice.collection_status)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma fatura encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Baixa Manual Tab */}
          <TabsContent value="baixa-manual">
            <BaixaManualAR />
          </TabsContent>

          {/* Baixa Automática Tab */}
          <TabsContent value="baixa-automatica">
            <BaixaAutomaticaAR />
          </TabsContent>

          {/* Histórico Tab */}
          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Baixas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Consulte o histórico completo em</p>
                  <Button variant="link" asChild>
                    <a href="/tesouraria/historico-baixas">Tesouraria → Histórico de Baixas</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
