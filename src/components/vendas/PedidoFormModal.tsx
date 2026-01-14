import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, X } from "lucide-react";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface PedidoItem {
  id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
  valor_total: number;
}

interface PedidoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId?: string;
  tipo?: 'V' | 'P' | 'O'; // Venda, Pedido, Orçamento
}

export function PedidoFormModal({ 
  open, 
  onOpenChange, 
  pedidoId,
  tipo = 'P'
}: PedidoFormModalProps) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { data: clientes = [] } = useClientes();
  const { data: produtos = [] } = useProdutos();

  // Form state
  const [clienteId, setClienteId] = useState("");
  const [dataVenda, setDataVenda] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataValidade, setDataValidade] = useState("");
  const [condicaoPagamento, setCondicaoPagamento] = useState("avista");
  const [vendedor, setVendedor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorFrete, setValorFrete] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item form state
  const [novoProdutoId, setNovoProdutoId] = useState("");
  const [novaQuantidade, setNovaQuantidade] = useState(1);
  const [novoPrecoUnitario, setNovoPrecoUnitario] = useState(0);
  const [novoDesconto, setNovoDesconto] = useState(0);

  // Calculations
  const subtotal = itens.reduce((sum, item) => sum + item.valor_total, 0);
  const totalGeral = subtotal - valorDesconto + valorFrete;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setClienteId("");
      setDataVenda(format(new Date(), 'yyyy-MM-dd'));
      setDataValidade("");
      setCondicaoPagamento("avista");
      setVendedor("");
      setObservacoes("");
      setItens([]);
      setValorDesconto(0);
      setValorFrete(0);
      setNovoProdutoId("");
      setNovaQuantidade(1);
      setNovoPrecoUnitario(0);
      setNovoDesconto(0);
    }
  }, [open]);

  // Update price when product is selected
  useEffect(() => {
    if (novoProdutoId) {
      const produto = produtos.find(p => p.id === novoProdutoId);
      if (produto) {
        setNovoPrecoUnitario(Number(produto.preco_venda) || 0);
      }
    }
  }, [novoProdutoId, produtos]);

  const handleAddItem = () => {
    if (!novoProdutoId) {
      toast.error("Selecione um produto");
      return;
    }
    if (novaQuantidade <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    const produto = produtos.find(p => p.id === novoProdutoId);
    if (!produto) return;

    const valorBruto = novaQuantidade * novoPrecoUnitario;
    const valorDescItem = valorBruto * (novoDesconto / 100);
    const valorTotal = valorBruto - valorDescItem;

    const novoItem: PedidoItem = {
      id: crypto.randomUUID(),
      produto_id: novoProdutoId,
      produto_nome: produto.descricao,
      quantidade: novaQuantidade,
      preco_unitario: novoPrecoUnitario,
      desconto_percentual: novoDesconto,
      valor_total: valorTotal,
    };

    setItens([...itens, novoItem]);
    setNovoProdutoId("");
    setNovaQuantidade(1);
    setNovoPrecoUnitario(0);
    setNovoDesconto(0);
  };

  const handleRemoveItem = (itemId: string) => {
    setItens(itens.filter(i => i.id !== itemId));
  };

  const handleSubmit = async () => {
    if (!currentCompany?.id) {
      toast.error("Empresa não selecionada");
      return;
    }
    if (!clienteId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the order
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          empresa_id: currentCompany.id,
          cliente_id: clienteId,
          tipo: tipo,
          data_venda: dataVenda,
          data_validade: dataValidade || null,
          situacao: 'A', // Aberto
          valor_produtos: subtotal,
          valor_desconto: valorDesconto,
          valor_frete: valorFrete,
          valor_seguro: 0,
          valor_outras_despesas: 0,
          valor_total: totalGeral,
          observacoes: observacoes || null,
        } as any)
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Create items - get next ordem number
      let ordem = 1;
      const itensToInsert = itens.map(item => ({
        venda_id: venda.id,
        ordem: ordem++,
        tipo_item: 'P' as const,
        produto_id: item.produto_id,
        descricao: item.produto_nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        percentual_desconto: item.desconto_percentual,
        valor_desconto: item.preco_unitario * item.quantidade * (item.desconto_percentual / 100),
        valor_total: item.valor_total,
      }));

      const { error: itensError } = await supabase
        .from('vendas_itens')
        .insert(itensToInsert as any);

      if (itensError) throw itensError;

      toast.success(
        tipo === 'O' ? 'Orçamento criado com sucesso!' :
        tipo === 'P' ? 'Pedido criado com sucesso!' :
        'Venda criada com sucesso!'
      );
      
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error("Erro ao criar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tipoLabel = tipo === 'O' ? 'Orçamento' : tipo === 'P' ? 'Pedido' : 'Venda';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo {tipoLabel}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="itens">Itens</TabsTrigger>
            <TabsTrigger value="totais">Totais</TabsTrigger>
            <TabsTrigger value="obs">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome_razao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input
                  type="date"
                  value={dataVenda}
                  onChange={(e) => setDataVenda(e.target.value)}
                />
              </div>

              {tipo === 'O' && (
                <div className="space-y-2">
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    value={dataValidade}
                    onChange={(e) => setDataValidade(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Condição de Pagamento</Label>
                <Select value={condicaoPagamento} onValueChange={setCondicaoPagamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avista">À Vista</SelectItem>
                    <SelectItem value="30dias">30 Dias</SelectItem>
                    <SelectItem value="30-60">30/60 Dias</SelectItem>
                    <SelectItem value="30-60-90">30/60/90 Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Input
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                  placeholder="Nome do vendedor"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="itens" className="space-y-4 mt-4">
            {/* Add Item Form */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-5 gap-2 items-end">
                  <div className="col-span-2">
                    <Label>Produto</Label>
                    <Select value={novoProdutoId} onValueChange={setNovoProdutoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                      {produtos.map(produto => (
                        <SelectItem key={produto.id} value={produto.id}>
                          {produto.codigo} - {produto.descricao}
                        </SelectItem>
                      ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      value={novaQuantidade}
                      onChange={(e) => setNovaQuantidade(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Preço Unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={novoPrecoUnitario}
                      onChange={(e) => setNovoPrecoUnitario(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Desc %</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        max={100}
                        value={novoDesconto}
                        onChange={(e) => setNovoDesconto(Number(e.target.value))}
                      />
                      <Button onClick={handleAddItem} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Desc %</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum item adicionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">
                          {item.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right">{item.desconto_percentual}%</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="totais" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorDesconto}
                    onChange={(e) => setValorDesconto(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frete (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorFrete}
                    onChange={(e) => setValorFrete(Number(e.target.value))}
                  />
                </div>
              </div>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span className="text-destructive">
                      -{valorDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete:</span>
                    <span>{valorFrete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Total Geral:</span>
                    <span className="text-primary">
                      {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="obs" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações gerais do pedido..."
                rows={6}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" /> 
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
