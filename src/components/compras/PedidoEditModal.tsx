import { useState, useEffect } from 'react';
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
import { Plus, X, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PedidoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: any;
}

interface ItemPedido {
  id?: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  total: number;
}

const statusOptions = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'parcial', label: 'Entrega Parcial' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function PedidoEditModal({ open, onOpenChange, pedido }: PedidoEditModalProps) {
  const [status, setStatus] = useState(pedido?.status || 'rascunho');
  const [previsaoEntrega, setPrevisaoEntrega] = useState(pedido?.previsao_entrega || '');
  const [observacoes, setObservacoes] = useState(pedido?.observacoes || '');
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pedido) {
      setStatus(pedido.status || 'rascunho');
      setPrevisaoEntrega(pedido.previsao_entrega || '');
      setObservacoes(pedido.observacoes || '');
      // Mock items for editing
      setItens([
        { id: '1', produto_id: '1', produto_nome: 'Produto Exemplo', quantidade: 10, preco_unitario: 100, desconto: 0, total: 1000 },
      ]);
    }
  }, [pedido]);

  const handleAddItem = () => {
    setItens([...itens, { produto_id: '', produto_nome: '', quantidade: 1, preco_unitario: 0, desconto: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemPedido, value: any) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    
    // Recalculate total
    if (['quantidade', 'preco_unitario', 'desconto'].includes(field)) {
      const item = newItens[index];
      const subtotal = item.quantidade * item.preco_unitario;
      item.total = subtotal - (subtotal * (item.desconto / 100));
    }
    
    setItens(newItens);
  };

  const calcularTotal = () => {
    return itens.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Implement actual update to database
      toast.success("Pedido atualizado com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar pedido: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Pedido: {pedido?.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status e Previsão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status do Pedido</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Previsão de Entrega</Label>
              <Input
                type="date"
                value={previsaoEntrega}
                onChange={(e) => setPrevisaoEntrega(e.target.value)}
              />
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens do Pedido</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Item
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Produto</th>
                    <th className="text-right p-2 w-24">Qtd</th>
                    <th className="text-right p-2 w-32">Preço Unit.</th>
                    <th className="text-right p-2 w-24">Desc. %</th>
                    <th className="text-right p-2 w-32">Total</th>
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum item no pedido
                      </td>
                    </tr>
                  ) : (
                    itens.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          <Input
                            value={item.produto_nome}
                            onChange={(e) => handleItemChange(index, 'produto_nome', e.target.value)}
                            placeholder="Nome do produto"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => handleItemChange(index, 'quantidade', Number(e.target.value))}
                            className="text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.preco_unitario}
                            onChange={(e) => handleItemChange(index, 'preco_unitario', Number(e.target.value))}
                            className="text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.desconto}
                            onChange={(e) => handleItemChange(index, 'desconto', Number(e.target.value))}
                            className="text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                        </td>
                        <td className="p-2">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {itens.length > 0 && (
                  <tfoot className="bg-muted">
                    <tr>
                      <td colSpan={4} className="p-2 text-right font-medium">Total do Pedido:</td>
                      <td className="p-2 text-right font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotal())}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre o pedido..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
