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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFornecedores } from '@/hooks/useFornecedores';
import { useProdutos } from '@/hooks/useProdutos';

interface CotacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemCotacao {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
}

export function CotacaoModal({ open, onOpenChange }: CotacaoModalProps) {
  const { data: fornecedores = [] } = useFornecedores();
  const { data: produtos = [] } = useProdutos();

  const [descricao, setDescricao] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState<string[]>([]);
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleFornecedor = (id: string) => {
    setFornecedoresSelecionados(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleAddItem = () => {
    setItens([...itens, { produto_id: '', produto_nome: '', quantidade: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemCotacao, value: any) => {
    const newItens = [...itens];
    if (field === 'produto_id') {
      const produto = produtos.find(p => p.id === value);
      newItens[index] = {
        ...newItens[index],
        produto_id: value,
        produto_nome: produto?.descricao || '',
      };
    } else {
      newItens[index] = { ...newItens[index], [field]: value };
    }
    setItens(newItens);
  };

  const handleSubmit = async () => {
    if (!descricao) {
      toast.error("Informe a descrição da cotação");
      return;
    }
    if (fornecedoresSelecionados.length === 0) {
      toast.error("Selecione pelo menos um fornecedor");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual save to database
      toast.success("Cotação criada com sucesso!");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Erro ao criar cotação: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescricao('');
    setDataValidade('');
    setFornecedoresSelecionados([]);
    setItens([]);
    setObservacoes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Cotação</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Materiais de escritório"
              />
            </div>
            <div className="space-y-2">
              <Label>Validade</Label>
              <Input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fornecedores para Cotação *</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {fornecedores.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum fornecedor cadastrado</p>
              ) : (
                fornecedores.map(f => (
                  <div key={f.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={f.id}
                      checked={fornecedoresSelecionados.includes(f.id)}
                      onCheckedChange={() => handleToggleFornecedor(f.id)}
                    />
                    <label htmlFor={f.id} className="text-sm cursor-pointer">{f.nome_razao}</label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {fornecedoresSelecionados.length} fornecedor(es) selecionado(s)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens da Cotação</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Item
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Produto/Serviço</th>
                    <th className="text-right p-2 w-32">Quantidade</th>
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum item adicionado
                      </td>
                    </tr>
                  ) : (
                    itens.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          <Select value={item.produto_id} onValueChange={(v) => handleItemChange(index, 'produto_id', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.descricao}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Condições especiais, prazos, etc..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar Cotação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
