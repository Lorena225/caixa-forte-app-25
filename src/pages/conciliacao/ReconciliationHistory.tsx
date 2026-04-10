import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useWallets } from '@/hooks/useCompanyData';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CheckCircle, Undo2, Search, Filter, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Mock data
const mockAutoSettlements = [
  {
    id: '1',
    date: '2026-01-10',
    title: 'Imposto ISS Janeiro',
    counterparty: 'Prefeitura Municipal',
    amount: 1250.00,
    direction: 'out',
    bankAccount: 'Bradesco CC',
    statementRef: 'DOC123456',
    matchConfidence: 98,
  },
  {
    id: '2',
    date: '2026-01-08',
    title: 'NF 1234 - Serviços Janeiro',
    counterparty: 'Cliente ABC Ltda',
    amount: 5430.00,
    direction: 'in',
    bankAccount: 'Itaú CC',
    statementRef: 'TED789012',
    matchConfidence: 95,
  },
  {
    id: '3',
    date: '2026-01-05',
    title: 'Aluguel Escritório',
    counterparty: 'Imobiliária Central',
    amount: 3500.00,
    direction: 'out',
    bankAccount: 'Bradesco CC',
    statementRef: 'BOLETO456789',
    matchConfidence: 100,
  },
];

export default function ReconciliationHistory() {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    walletId: '',
    search: '',
  });
  const [selectedSettlement, setSelectedSettlement] = useState<typeof mockAutoSettlements[0] | null>(null);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);

  const { data: wallets = [] } = useWallets();
  const bankWallets = wallets.filter((w) => w.type === 'banco');

  const handleReverse = () => {
    if (!selectedSettlement) return;
    toast.success(`Baixa estornada com sucesso para "${selectedSettlement.title}"`);
    setReverseDialogOpen(false);
    setSelectedSettlement(null);
  };

  const handleViewDetails = (settlement: typeof mockAutoSettlements[0]) => {
    setSelectedSettlement(settlement);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data De</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Até</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Conta Bancária</label>
              <Select
                value={filters.walletId || '__all__'}
                onValueChange={(v) => setFilters({ ...filters, walletId: v === '__all__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {bankWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Título, contraparte..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Baixas Automáticas Realizadas
          </CardTitle>
          <CardDescription>
            Histórico de baixas processadas automaticamente pelo motor de conciliação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Contraparte</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-center">Confiança</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAutoSettlements.map((settlement) => (
                <TableRow key={settlement.id}>
                  <TableCell>{formatDate(settlement.date)}</TableCell>
                  <TableCell className="font-medium">{settlement.title}</TableCell>
                  <TableCell>{settlement.counterparty}</TableCell>
                  <TableCell>{settlement.bankAccount}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={settlement.matchConfidence >= 95 ? 'default' : 'secondary'}
                      className={settlement.matchConfidence >= 95 ? 'bg-success' : ''}
                    >
                      {settlement.matchConfidence}%
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${settlement.direction === 'in' ? 'text-success' : 'text-destructive'}`}>
                    {settlement.direction === 'in' ? '+' : '-'}{formatCurrency(settlement.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(settlement)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedSettlement(settlement);
                          setReverseDialogOpen(true);
                        }}
                      >
                        <Undo2 className="h-4 w-4 text-warning" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reverse Dialog */}
      <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Estornar Baixa Automática
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja estornar esta baixa? O título voltará para status "Em aberto".
            </DialogDescription>
          </DialogHeader>

          {selectedSettlement && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Título:</span>
                <span className="font-medium">{selectedSettlement.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Contraparte:</span>
                <span>{selectedSettlement.counterparty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor:</span>
                <span className="font-semibold">{formatCurrency(selectedSettlement.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Data da baixa:</span>
                <span>{formatDate(selectedSettlement.date)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReverse}>
              <Undo2 className="mr-2 h-4 w-4" />
              Confirmar Estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
