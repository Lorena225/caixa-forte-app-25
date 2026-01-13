import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useSettlements,
  useReverseSettlement,
  TitleType,
  SettlementStatus,
  SETTLEMENT_TYPE_LABELS,
  SETTLEMENT_ORIGIN_LABELS,
} from '@/hooks/useSettlements';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { RotateCcw, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SettlementDetail {
  id: string;
  transaction_id: string;
  amount_settled: number;
  interest: number;
  penalty: number;
  discount: number;
  previous_balance: number;
  new_balance: number;
  transaction_description?: string;
}

export default function HistoricoBaixas() {
  const { currentCompany } = useAuth();
  const [titleType, setTitleType] = useState<TitleType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [reversalNotes, setReversalNotes] = useState('');

  const { data: settlements = [], isLoading } = useSettlements({
    title_type: titleType || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const reverseSettlement = useReverseSettlement();

  // Fetch items for expanded settlement
  const { data: settlementItems = [] } = useQuery({
    queryKey: ['settlement-items', expandedId],
    queryFn: async () => {
      if (!expandedId || !currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('settlement_items')
        .select(`
          id,
          transaction_id,
          amount_settled,
          interest,
          penalty,
          discount,
          previous_balance,
          new_balance,
          transactions:transaction_id (description)
        `)
        .eq('settlement_id', expandedId)
        .eq('company_id', currentCompany.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        transaction_description: item.transactions?.description,
      })) as SettlementDetail[];
    },
    enabled: !!expandedId && !!currentCompany?.id,
  });

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenReversal = (id: string) => {
    setSelectedSettlementId(id);
    setReversalNotes('');
    setReversalDialogOpen(true);
  };

  const handleConfirmReversal = async () => {
    if (!selectedSettlementId) return;

    await reverseSettlement.mutateAsync({
      settlementId: selectedSettlementId,
      notes: reversalNotes || undefined,
    });

    setReversalDialogOpen(false);
    setSelectedSettlementId(null);
  };

  const getStatusBadge = (status: string, isReversal: boolean) => {
    if (isReversal) {
      return <Badge variant="outline" className="text-warning border-warning">Estorno</Badge>;
    }
    switch (status) {
      case 'PROCESSADO':
        return <Badge variant="default">Processado</Badge>;
      case 'CANCELADO':
        return <Badge variant="secondary">Cancelado</Badge>;
      case 'RASCUNHO':
        return <Badge variant="outline">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Histórico de Baixas"
          description="Consulte e gerencie o histórico de baixas realizadas"
        />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={titleType || '__all__'} onValueChange={(v) => setTitleType(v === '__all__' ? '' : v as TitleType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="PAGAR">Contas a Pagar</SelectItem>
                    <SelectItem value="RECEBER">Contas a Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data De</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Até</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTitleType('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settlements List */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>AP/AR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => (
                  <>
                    <TableRow key={settlement.id} className="cursor-pointer" onClick={() => handleToggleExpand(settlement.id)}>
                      <TableCell>
                        {expandedId === settlement.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(settlement.settlement_date)}</TableCell>
                      <TableCell>
                        {SETTLEMENT_TYPE_LABELS[settlement.settlement_type as keyof typeof SETTLEMENT_TYPE_LABELS] || settlement.settlement_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SETTLEMENT_ORIGIN_LABELS[settlement.origin as keyof typeof SETTLEMENT_ORIGIN_LABELS] || settlement.origin}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={settlement.title_type === 'PAGAR' ? 'destructive' : 'default'}>
                          {settlement.title_type === 'PAGAR' ? 'AP' : 'AR'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(settlement.status, settlement.is_reversal)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{settlement.notes || '-'}</TableCell>
                      <TableCell>
                        {settlement.status === 'PROCESSADO' && !settlement.is_reversal && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReversal(settlement.id);
                            }}
                            title="Estornar"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded Items */}
                    {expandedId === settlement.id && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Itens da Baixa</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Título</TableHead>
                                  <TableHead className="text-right">Saldo Anterior</TableHead>
                                  <TableHead className="text-right">Valor Baixa</TableHead>
                                  <TableHead className="text-right">Juros</TableHead>
                                  <TableHead className="text-right">Multa</TableHead>
                                  <TableHead className="text-right">Desconto</TableHead>
                                  <TableHead className="text-right">Novo Saldo</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {settlementItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.transaction_description || item.transaction_id}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.previous_balance)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(item.amount_settled)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.interest)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.penalty)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.new_balance)}</TableCell>
                                  </TableRow>
                                ))}
                                {settlementItems.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                      Carregando...
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {settlements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Carregando...' : 'Nenhuma baixa encontrada'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Reversal Dialog */}
        <Dialog open={reversalDialogOpen} onOpenChange={setReversalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Estornar Baixa</DialogTitle>
              <DialogDescription>
                O estorno irá reverter todos os saldos dos títulos afetados e criar um registro de estorno.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Motivo do Estorno (opcional)</Label>
                <Input
                  value={reversalNotes}
                  onChange={(e) => setReversalNotes(e.target.value)}
                  placeholder="Ex: Erro de digitação, pagamento cancelado..."
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg">
                <RotateCcw className="h-5 w-5 text-warning" />
                <p className="text-sm">
                  Esta ação é irreversível e será registrada no histórico de auditoria.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReversalDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReversal}
                disabled={reverseSettlement.isPending}
              >
                {reverseSettlement.isPending ? 'Processando...' : 'Confirmar Estorno'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
