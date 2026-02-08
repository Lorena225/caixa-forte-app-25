import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMRPConversion } from "@/hooks/useShopFloor";
import { 
  Calculator, 
  Clock,
  TrendingUp,
  CheckCircle2,
  Factory,
  ShoppingCart,
  Loader2
} from "lucide-react";

interface MRPRequirement {
  id: string;
  product_id: string;
  requirement_type: string;
  source_type?: string;
  required_date: string;
  net_requirement?: number;
  required_quantity?: number;
  suggested_order_qty?: number;
  status: string;
  products?: { name: string; code?: string };
}

interface RequirementsTableProps {
  requirements: MRPRequirement[];
  isLoading: boolean;
  showSelection?: boolean;
}

export function RequirementsTable({ requirements, isLoading, showSelection = true }: RequirementsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { convertToPurchase, convertToProduction, convertBatch } = useMRPConversion();

  const pendingRequirements = requirements.filter(r => r.status !== 'converted');

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === pendingRequirements.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRequirements.map(r => r.id));
    }
  };

  const handleConvert = async (req: MRPRequirement) => {
    if (req.requirement_type === 'purchase') {
      await convertToPurchase.mutateAsync(req.id);
    } else {
      await convertToProduction.mutateAsync(req.id);
    }
  };

  const handleBatchConvert = async () => {
    if (selectedIds.length === 0) return;
    await convertBatch.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'suggested':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Sugerido</Badge>;
      case 'approved':
      case 'planned':
        return <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" /> Aprovado</Badge>;
      case 'converted':
      case 'released':
        return <Badge className="gap-1 bg-success"><CheckCircle2 className="h-3 w-3" /> Convertido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'production':
        return <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 gap-1">
          <Factory className="h-3 w-3" /> Produção
        </Badge>;
      case 'purchase':
        return <Badge variant="default" className="bg-success/10 text-success hover:bg-success/20 gap-1">
          <ShoppingCart className="h-3 w-3" /> Compra
        </Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const isConverting = convertToPurchase.isPending || convertToProduction.isPending || convertBatch.isPending;

  return (
    <Card>
      {/* Batch Actions Bar */}
      {showSelection && selectedIds.length > 0 && (
        <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} item(ns) selecionado(s)
          </span>
          <Button 
            size="sm" 
            onClick={handleBatchConvert}
            disabled={isConverting}
            className="gap-2"
          >
            {isConverting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Converter Selecionados
          </Button>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            {showSelection && (
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={selectedIds.length === pendingRequirements.length && pendingRequirements.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
            )}
            <TableHead>Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead>Data Necessária</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead className="w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={showSelection ? 8 : 7} className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Carregando...
              </TableCell>
            </TableRow>
          ) : requirements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showSelection ? 8 : 7} className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma necessidade calculada.</p>
                <p className="text-sm">Execute o MRP para gerar as necessidades.</p>
              </TableCell>
            </TableRow>
          ) : (
            requirements.map(req => {
              const isPending = req.status !== 'converted';
              const quantity = req.net_requirement || req.required_quantity || req.suggested_order_qty || 0;
              
              return (
                <TableRow key={req.id} className={!isPending ? 'opacity-60' : ''}>
                  {showSelection && (
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(req.id)}
                        onCheckedChange={() => toggleSelection(req.id)}
                        disabled={!isPending}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {req.products?.name || 'Produto não encontrado'}
                  </TableCell>
                  <TableCell>{getTypeBadge(req.requirement_type)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {quantity.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {new Date(req.required_date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {req.source_type === 'sales_order' ? 'Pedido de Venda' : 
                     req.source_type === 'forecast' ? 'Previsão' : 
                     req.source_type === 'bom_explosion' ? 'Explosão BOM' : 
                     req.source_type === 'manual' ? 'Manual' : req.source_type || '-'}
                  </TableCell>
                  <TableCell>
                    {isPending && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleConvert(req)}
                        disabled={isConverting}
                        className="gap-1"
                      >
                        {isConverting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : req.requirement_type === 'production' ? (
                          <>
                            <Factory className="h-3 w-3" />
                            Criar OP
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3 w-3" />
                            Criar RC
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
