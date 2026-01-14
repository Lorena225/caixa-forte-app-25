import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, Plus, Trash2, Save, FileText, Receipt, User, Package, ShoppingCart 
} from "lucide-react";
import { toast } from "sonner";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { useCreateVenda } from "@/hooks/useVendasMutations";
import { useNavigate } from "react-router-dom";

interface ItemVenda {
  id: string;
  produto_id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  valor_desconto: number;
  valor_total: number;
  ncm?: string;
  cfop?: string;
}

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

export default function NovaVenda() {
  const navigate = useNavigate();
  const { data: clientes = [] } = useClientes();
  const { data: produtos = [] } = useProdutos();
  const createVenda = useCreateVenda();

  // Estado do formulário
  const [clienteId, setClienteId] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [produtoBusca, setProdutoBusca] = useState("");
  const [produtoDialogOpen, setProdutoDialogOpen] = useState(false);
  
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [parcelas, setParcelas] = useState(1);
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [frete, setFrete] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  
  // Cliente selecionado
  const clienteSelecionado = useMemo(() => 
    clientes.find(c => c.id === clienteId), 
    [clientes, clienteId]
  );

  // Filtros
  const clientesFiltrados = useMemo(() => 
    clientes.filter(c => 
      c.nome_razao?.toLowerCase().includes(clienteBusca.toLowerCase()) ||
      c.nome_fantasia?.toLowerCase().includes(clienteBusca.toLowerCase()) ||
      c.cpf_cnpj?.includes(clienteBusca)
    ).slice(0, 20),
    [clientes, clienteBusca]
  );

  const produtosFiltrados = useMemo(() => 
    produtos.filter(p => 
      p.descricao?.toLowerCase().includes(produtoBusca.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(produtoBusca.toLowerCase())
    ).slice(0, 20),
    [produtos, produtoBusca]
  );

  // Cálculos de totais
  const totais = useMemo(() => {
    const valorProdutos = itens.reduce((sum, i) => sum + i.valor_total, 0);
    const valorDescontoItens = itens.reduce((sum, i) => sum + i.valor_desconto, 0);
    const valorTotal = valorProdutos - descontoGeral + frete;
    return {
      valorProdutos,
      valorDescontoItens,
      descontoGeral,
      frete,
      valorTotal: Math.max(0, valorTotal),
    };
  }, [itens, descontoGeral, frete]);

  // Handlers
  const handleSelectCliente = (cliente: typeof clientes[0]) => {
    setClienteId(cliente.id);
    setClienteDialogOpen(false);
  };

  const handleAddProduto = (produto: typeof produtos[0]) => {
    const novoItem: ItemVenda = {
      id: crypto.randomUUID(),
      produto_id: produto.id,
      codigo: produto.codigo || '',
      descricao: produto.descricao || '',
      quantidade: 1,
      unidade: produto.unidade || 'UN',
      preco_unitario: Number(produto.preco_venda) || 0,
      valor_desconto: 0,
      valor_total: Number(produto.preco_venda) || 0,
      ncm: produto.ncm,
      cfop: produto.cfop_padrao,
    };
    setItens(prev => [...prev, novoItem]);
    setProdutoDialogOpen(false);
    setProdutoBusca("");
  };

  const handleUpdateItem = (id: string, field: keyof ItemVenda, value: number) => {
    setItens(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      // Recalcula o valor total do item
      updated.valor_total = (updated.quantidade * updated.preco_unitario) - updated.valor_desconto;
      return updated;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItens(prev => prev.filter(item => item.id !== id));
  };

  const handleSalvar = async (tipo: 'V' | 'O' | 'P') => {
    if (!clienteId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    try {
      await createVenda.mutateAsync({
        tipo,
        cliente_id: clienteId,
        cliente_nome: clienteSelecionado?.nome_razao || clienteSelecionado?.nome_fantasia,
        cliente_cpf_cnpj: clienteSelecionado?.cpf_cnpj,
        valor_produtos: totais.valorProdutos,
        valor_desconto: totais.descontoGeral + totais.valorDescontoItens,
        valor_frete: totais.frete,
        valor_total: totais.valorTotal,
        observacoes,
        itens: itens.map((item, idx) => ({
          ordem: idx + 1,
          tipo_item: 'P',
          produto_id: item.produto_id,
          codigo: item.codigo,
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          preco_unitario: item.preco_unitario,
          valor_desconto: item.valor_desconto,
          valor_total: item.valor_total,
          ncm: item.ncm,
          cfop: item.cfop,
        })),
        pagamentos: [{
          sequencia: 1,
          forma_pagamento: formaPagamento,
          valor: totais.valorTotal,
          percentual: 100,
          numero_parcelas: parcelas,
        }],
      });

      const tipoLabel = tipo === 'V' ? 'Venda' : tipo === 'O' ? 'Orçamento' : 'Pedido';
      toast.success(`${tipoLabel} criado com sucesso!`);
      navigate("/vendas/pedidos");
    } catch (error) {
      toast.error("Erro ao salvar venda");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <PageHeader 
          title="Nova Venda" 
          description="PDV - Frente de Caixa"
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Coluna Principal - Itens */}
          <div className="lg:col-span-2 space-y-4">
            {/* Seleção de Cliente */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" /> Cliente
                  </CardTitle>
                  <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-1" /> Buscar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Selecionar Cliente</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Buscar por nome, fantasia ou CPF/CNPJ..."
                          value={clienteBusca}
                          onChange={(e) => setClienteBusca(e.target.value)}
                        />
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-1">
                            {clientesFiltrados.map(cliente => (
                              <button
                                key={cliente.id}
                                onClick={() => handleSelectCliente(cliente)}
                                className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
                              >
                                <p className="font-medium">{cliente.nome_razao || cliente.nome_fantasia}</p>
                                <p className="text-sm text-muted-foreground">
                                  {cliente.cpf_cnpj} • {cliente.cidade}/{cliente.uf}
                                </p>
                              </button>
                            ))}
                            {clientesFiltrados.length === 0 && (
                              <p className="text-center text-muted-foreground py-8">
                                Nenhum cliente encontrado
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="py-2">
                {clienteSelecionado ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{clienteSelecionado.nome_razao || clienteSelecionado.nome_fantasia}</p>
                      <p className="text-sm text-muted-foreground">
                        {clienteSelecionado.cpf_cnpj} • {clienteSelecionado.cidade}/{clienteSelecionado.uf}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setClienteId("")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum cliente selecionado</p>
                )}
              </CardContent>
            </Card>

            {/* Adicionar Produtos */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" /> Produtos
                  </CardTitle>
                  <Dialog open={produtoDialogOpen} onOpenChange={setProdutoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" /> Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Adicionar Produto</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Buscar por código ou descrição..."
                          value={produtoBusca}
                          onChange={(e) => setProdutoBusca(e.target.value)}
                          autoFocus
                        />
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-1">
                            {produtosFiltrados.map(produto => (
                              <button
                                key={produto.id}
                                onClick={() => handleAddProduto(produto)}
                                className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
                              >
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium">{produto.descricao}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Cód: {produto.codigo} • {produto.unidade}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-primary">
                                    {Number(produto.preco_venda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                              </button>
                            ))}
                            {produtosFiltrados.length === 0 && (
                              <p className="text-center text-muted-foreground py-8">
                                Nenhum produto encontrado
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[80px] text-right">Qtd</TableHead>
                      <TableHead className="w-[100px] text-right">Preço</TableHead>
                      <TableHead className="w-[80px] text-right">Desc.</TableHead>
                      <TableHead className="w-[100px] text-right">Total</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.descricao}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(item.id, 'quantidade', Number(e.target.value))}
                            className="h-8 w-16 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.preco_unitario}
                            onChange={(e) => handleUpdateItem(item.id, 'preco_unitario', Number(e.target.value))}
                            className="h-8 w-20 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor_desconto}
                            onChange={(e) => handleUpdateItem(item.id, 'valor_desconto', Number(e.target.value))}
                            className="h-8 w-16 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itens.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum item adicionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Observações da venda..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                />
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral - Resumo e Pagamento */}
          <div className="space-y-4">
            {/* Pagamento */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map(fp => (
                        <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(formaPagamento === 'cartao_credito' || formaPagamento === 'boleto') && (
                  <div className="space-y-2">
                    <Label>Parcelas</Label>
                    <Select value={String(parcelas)} onValueChange={(v) => setParcelas(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(p => (
                          <SelectItem key={p} value={String(p)}>{p}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Desconto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={descontoGeral}
                      onChange={(e) => setDescontoGeral(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frete (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={frete}
                      onChange={(e) => setFrete(Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Totais */}
            <Card className="bg-muted/50">
              <CardContent className="py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({itens.length} itens)</span>
                  <span>{totais.valorProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                {(totais.descontoGeral + totais.valorDescontoItens) > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Descontos</span>
                    <span>-{(totais.descontoGeral + totais.valorDescontoItens).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
                {totais.frete > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Frete</span>
                    <span>{totais.frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    {totais.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                {parcelas > 1 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {parcelas}x de {(totais.valorTotal / parcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="space-y-2">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handleSalvar('V')}
                disabled={createVenda.isPending}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Finalizar Venda
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleSalvar('O')}
                  disabled={createVenda.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Orçamento
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleSalvar('P')}
                  disabled={createVenda.isPending}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Pedido
                </Button>
              </div>
              <Button variant="secondary" className="w-full" disabled>
                <Receipt className="mr-2 h-4 w-4" />
                Emitir NF-e
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
