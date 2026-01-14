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
import { Send, X, FileText } from "lucide-react";
import { useVendas } from "@/hooks/useVendas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface NFeEmissaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId?: string;
}

const NATUREZA_OPERACOES = [
  { value: 'venda', label: 'Venda de Mercadoria' },
  { value: 'devolucao', label: 'Devolução de Mercadoria' },
  { value: 'remessa', label: 'Remessa para Conserto' },
  { value: 'bonificacao', label: 'Bonificação' },
  { value: 'demonstracao', label: 'Demonstração' },
];

const CFOPS = [
  { value: '5102', label: '5102 - Venda de mercadoria' },
  { value: '5405', label: '5405 - Venda de mercadoria ST' },
  { value: '6102', label: '6102 - Venda interestadual' },
  { value: '5910', label: '5910 - Bonificação' },
  { value: '5949', label: '5949 - Outra saída' },
];

export function NFeEmissaoModal({ 
  open, 
  onOpenChange, 
  vendaId: propVendaId 
}: NFeEmissaoModalProps) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch faturados orders
  const { data: pedidosFaturados = [] } = useVendas({ 
    situacao: 'F',
  });

  // Form state
  const [vendaId, setVendaId] = useState(propVendaId || "");
  const [naturezaOperacao, setNaturezaOperacao] = useState("venda");
  const [cfopPadrao, setCfopPadrao] = useState("5102");
  const [serie, setSerie] = useState("1");
  const [infoComplementares, setInfoComplementares] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected order details
  const [vendaDetalhes, setVendaDetalhes] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      if (!propVendaId) setVendaId("");
      setNaturezaOperacao("venda");
      setCfopPadrao("5102");
      setSerie("1");
      setInfoComplementares("");
      setVendaDetalhes(null);
      setItens([]);
    }
  }, [open, propVendaId]);

  // Load order details when selected
  useEffect(() => {
    if (vendaId && currentCompany?.id) {
      loadVendaDetalhes();
    }
  }, [vendaId, currentCompany?.id]);

  const loadVendaDetalhes = async () => {
    try {
      // Get order
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', vendaId)
        .single();

      if (vendaError) throw vendaError;
      setVendaDetalhes(venda);

      // Get items
      const { data: vendaItens, error: itensError } = await supabase
        .from('vendas_itens')
        .select(`
          *,
          produto:produtos(id, codigo, nome, ncm)
        `)
        .eq('venda_id', vendaId);

      if (itensError) throw itensError;
      
      // Add fiscal fields to items
      setItens((vendaItens || []).map(item => ({
        ...item,
        cfop: cfopPadrao,
        cst: '000',
        aliquota_icms: 18,
        valor_icms: (item.valor_total || 0) * 0.18,
      })));
    } catch (error: any) {
      console.error('Error loading order:', error);
      toast.error("Erro ao carregar pedido");
    }
  };

  // Update CFOP on all items
  useEffect(() => {
    if (itens.length > 0) {
      setItens(itens.map(item => ({
        ...item,
        cfop: cfopPadrao,
      })));
    }
  }, [cfopPadrao]);

  // Calculate totals
  const totalProdutos = itens.reduce((sum, item) => sum + (item.valor_total || 0), 0);
  const totalICMS = itens.reduce((sum, item) => sum + (item.valor_icms || 0), 0);
  const totalNF = totalProdutos;

  const handleSubmit = async () => {
    if (!currentCompany?.id) {
      toast.error("Empresa não selecionada");
      return;
    }
    if (!vendaId) {
      toast.error("Selecione um pedido");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate next document number
      const { data: existingDocs } = await supabase
        .from('fiscal_documents')
        .select('document_number')
        .eq('company_id', currentCompany.id)
        .eq('document_model', '55')
        .eq('document_series', serie)
        .order('document_number', { ascending: false })
        .limit(1);

      let nextNumber = '000000001';
      if (existingDocs && existingDocs.length > 0) {
        const lastNum = parseInt(existingDocs[0].document_number || '0', 10);
        nextNumber = String(lastNum + 1).padStart(9, '0');
      }

      // Create fiscal document
      const { error: nfeError } = await supabase
        .from('fiscal_documents')
        .insert({
          company_id: currentCompany.id,
          document_model: '55',
          document_series: serie,
          document_number: nextNumber,
          operation_type: 'saida',
          issue_date: new Date().toISOString().split('T')[0],
          status: 'rascunho',
          total_products: totalProdutos,
          total_icms: totalICMS,
          total_nf: totalNF,
          notes: infoComplementares || null,
          counterparty_id: vendaDetalhes?.cliente_id || null,
        } as any);

      if (nfeError) throw nfeError;

      toast.success("NF-e criada com sucesso! Status: Rascunho");
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating NF-e:', error);
      toast.error("Erro ao criar NF-e: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emitir NF-e
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pedido" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pedido">Pedido</TabsTrigger>
            <TabsTrigger value="fiscal">Dados Fiscais</TabsTrigger>
            <TabsTrigger value="itens">Itens</TabsTrigger>
            <TabsTrigger value="totais">Totais</TabsTrigger>
          </TabsList>

          <TabsContent value="pedido" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Selecione o Pedido Faturado *</Label>
              <Select value={vendaId} onValueChange={setVendaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pedido faturado" />
                </SelectTrigger>
                <SelectContent>
                  {pedidosFaturados.map(pedido => (
                    <SelectItem key={pedido.id} value={pedido.id}>
                      {pedido.numero} - {pedido.cliente_nome} - {Number(pedido.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {vendaDetalhes && (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground text-sm">Número:</span>
                      <p className="font-medium">{vendaDetalhes.numero}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Data:</span>
                      <p className="font-medium">
                        {format(new Date(vendaDetalhes.data_venda), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Cliente:</span>
                      <p className="font-medium">{vendaDetalhes.cliente_nome}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Valor Total:</span>
                      <p className="font-medium text-primary">
                        {Number(vendaDetalhes.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="fiscal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Natureza da Operação *</Label>
                <Select value={naturezaOperacao} onValueChange={setNaturezaOperacao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NATUREZA_OPERACOES.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CFOP Padrão *</Label>
                <Select value={cfopPadrao} onValueChange={setCfopPadrao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CFOPS.map(cfop => (
                      <SelectItem key={cfop.value} value={cfop.value}>
                        {cfop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Série</Label>
                <Input
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Operação</Label>
                <Input value="Saída" disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Informações Complementares</Label>
              <Textarea
                value={infoComplementares}
                onChange={(e) => setInfoComplementares(e.target.value)}
                placeholder="Informações adicionais da nota fiscal..."
                rows={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="itens" className="space-y-4 mt-4">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead>CFOP</TableHead>
                    <TableHead>CST</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Alíq. ICMS</TableHead>
                    <TableHead className="text-right">Valor ICMS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Selecione um pedido para carregar os itens
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.produto?.nome || '-'}</TableCell>
                        <TableCell>{item.produto?.ncm || '-'}</TableCell>
                        <TableCell>{item.cfop}</TableCell>
                        <TableCell>{item.cst}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">
                          {(item.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right">{item.aliquota_icms}%</TableCell>
                        <TableCell className="text-right">
                          {(item.valor_icms || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="totais" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-semibold">Base de Cálculo</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base ICMS:</span>
                    <span>{totalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor ICMS:</span>
                    <span>{totalICMS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base IPI:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor IPI:</span>
                    <span>R$ 0,00</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-semibold">Totais da NF-e</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Produtos:</span>
                    <span>{totalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seguro:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>TOTAL NF-e:</span>
                    <span className="text-primary">
                      {totalNF.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !vendaId}>
            <Send className="mr-2 h-4 w-4" /> 
            {isSubmitting ? 'Criando...' : 'Criar NF-e'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
