import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, FileText, Upload, HelpCircle, AlertCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFornecedores } from '@/hooks/useFornecedores';
import { useProdutos } from '@/hooks/useProdutos';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatePurchaseEntry, useProcessPurchaseEntry } from '@/hooks/usePurchaseEntries';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EntradaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EntryItem {
  product_id: string;
  quantity: number;
  unit_cost: number;
}

export function EntradaModal({ open, onOpenChange }: EntradaModalProps) {
  const { currentCompany } = useAuth();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: produtos = [] } = useProdutos(currentCompany?.id, 'P');
  const createEntry = useCreatePurchaseEntry();
  const processEntry = useProcessPurchaseEntry();

  const [fornecedorId, setFornecedorId] = useState('');
  const [numeroNFe, setNumeroNFe] = useState('');
  const [serieNFe, setSerieNFe] = useState('');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [chaveNFe, setChaveNFe] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [items, setItems] = useState<EntryItem[]>([{ product_id: '', quantity: 1, unit_cost: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_cost: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof EntryItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'product_id') {
      newItems[index][field] = value as string;
      // Auto-fill unit cost from product
      const product = produtos.find(p => p.id === value);
      if (product?.preco_custo) {
        newItems[index].unit_cost = product.preco_custo;
      }
    } else {
      newItems[index][field] = Number(value);
    }
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!fornecedorId) {
      toast.error("Selecione um fornecedor");
      return;
    }
    if (!numeroNFe) {
      toast.error("Informe o número da NF-e");
      return;
    }
    if (items.some(i => !i.product_id || i.quantity <= 0)) {
      toast.error("Preencha todos os itens corretamente");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create entry with items
      const entry = await createEntry.mutateAsync({
        supplier_id: fornecedorId,
        entry_date: dataEntrada,
        invoice_number: numeroNFe,
        invoice_series: serieNFe || undefined,
        total_amount: totalAmount,
        notes: observacoes || undefined,
        items: items.filter(i => i.product_id),
      });

      // 2. Process entry (update stock, create movement, create AP)
      await processEntry.mutateAsync(entry.id);

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      // Error already handled by hooks
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFornecedorId('');
    setNumeroNFe('');
    setSerieNFe('');
    setDataEntrada(new Date().toISOString().split('T')[0]);
    setChaveNFe('');
    setObservacoes('');
    setItems([{ product_id: '', quantity: 1, unit_cost: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nova Entrada de Mercadoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alert explaining automatic actions */}
          <Alert className="bg-primary/5 border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Ao confirmar esta entrada, o sistema executará automaticamente:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Atualização do saldo de estoque dos produtos</li>
                <li>Registro do custo médio ponderado no Catálogo</li>
                <li>Criação de conta a pagar no Financeiro</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Importar XML da NF-e</p>
            <p className="text-sm text-muted-foreground mb-3">
              Arraste o arquivo XML ou clique para selecionar
            </p>
            <Button variant="outline" size="sm">
              Selecionar Arquivo
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou preencha manualmente
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_razao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data da Entrada</Label>
              <Input
                type="date"
                value={dataEntrada}
                onChange={(e) => setDataEntrada(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Número NF-e *</Label>
              <Input
                value={numeroNFe}
                onChange={(e) => setNumeroNFe(e.target.value)}
                placeholder="000000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Série NF-e</Label>
              <Input
                value={serieNFe}
                onChange={(e) => setSerieNFe(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chave de Acesso NF-e</Label>
            <Input
              value={chaveNFe}
              onChange={(e) => setChaveNFe(e.target.value)}
              placeholder="44 dígitos"
              maxLength={44}
            />
          </div>

          {/* Items section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Itens da Entrada</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Item
              </Button>
            </div>
            
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Produto</Label>}
                    <Select value={item.product_id} onValueChange={(v) => updateItem(index, 'product_id', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.descricao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Qtde</Label>}
                    <Input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Custo Unit.</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 flex gap-1">
                    {index === 0 && <Label className="text-xs text-muted-foreground invisible">-</Label>}
                    <div className="text-sm font-medium py-2 px-2 bg-muted rounded text-center flex-1">
                      {(item.quantity * item.unit_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-2">Total:</span>
                <span className="text-lg font-bold">
                  {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a entrada..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Processando...' : 'Confirmar Entrada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
