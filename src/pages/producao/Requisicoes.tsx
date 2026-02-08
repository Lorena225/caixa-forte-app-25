import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  ShoppingCart, 
  FileText,
  CheckCircle2,
  Clock,
  Send,
  Package
} from "lucide-react";
import { usePurchaseRequisitions } from "@/hooks/usePCP";
import { toast } from "sonner";

export default function Requisicoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const { data: requisitions = [], isLoading } = usePurchaseRequisitions();

  const filteredRequisitions = requisitions.filter(req => 
    req.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requisition_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequisitions = requisitions.filter(r => r.status === 'pending');
  const approvedRequisitions = requisitions.filter(r => r.status === 'approved');

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredRequisitions.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredRequisitions.map(r => r.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGeneratePurchaseOrder = () => {
    if (selectedItems.length === 0) {
      toast.error("Selecione ao menos uma requisição");
      return;
    }
    toast.success(`Pedido de compra gerado para ${selectedItems.length} itens!`);
    setSelectedItems([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-green-500/10 text-green-600"><CheckCircle2 className="h-3 w-3" /> Aprovada</Badge>;
      case 'ordered':
        return <Badge className="gap-1"><Send className="h-3 w-3" /> Em Pedido</Badge>;
      case 'received':
        return <Badge variant="secondary" className="gap-1"><Package className="h-3 w-3" /> Recebida</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Requisições de Compra"
          description="Gerencie solicitações de materiais geradas pelo MRP"
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-3xl font-bold">{pendingRequisitions.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aprovadas</p>
                  <p className="text-3xl font-bold">{approvedRequisitions.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{requisitions.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar requisição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            className="gap-2"
            disabled={selectedItems.length === 0}
            onClick={handleGeneratePurchaseOrder}
          >
            <ShoppingCart className="h-4 w-4" />
            Gerar Pedido ({selectedItems.length})
          </Button>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedItems.length === filteredRequisitions.length && filteredRequisitions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Requisição</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Data Necessária</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredRequisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma requisição encontrada.</p>
                    <p className="text-sm">As requisições são geradas automaticamente pelo MRP.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequisitions.map(req => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedItems.includes(req.id)}
                        onCheckedChange={() => toggleSelectItem(req.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono">{req.requisition_number}</TableCell>
                    <TableCell className="font-medium">{req.products?.name || 'Sem produto'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {req.quantity?.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {new Date(req.required_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {(req as any).source_document || 'MRP'}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
