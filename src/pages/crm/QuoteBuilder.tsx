import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Calculator, 
  Save, 
  Send, 
  ArrowLeft,
  Package,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useQuoteBuilder, type PriceBookItem } from "@/hooks/useQuoteBuilder";
import { formatCurrency } from "@/services/cpqService";

export default function QuoteBuilder() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  const {
    items,
    selectedPriceBookId,
    setSelectedPriceBookId,
    priceBooks,
    priceBookItems,
    addItem,
    removeItem,
    updateItem,
    calculateTotals,
    createQuote,
  } = useQuoteBuilder(opportunityId);

  const totals = calculateTotals();

  const handleAddItem = async () => {
    if (!selectedProduct || quantity <= 0) {
      toast.error("Selecione um produto e quantidade válida");
      return;
    }

    const priceBookItem = priceBookItems.data?.find(
      (item) => item.product_id === selectedProduct
    );

    if (!priceBookItem) {
      toast.error("Produto não encontrado na lista de preços");
      return;
    }

    await addItem(priceBookItem, quantity);
    setSelectedProduct("");
    setQuantity(1);
    toast.success("Produto adicionado à proposta");
  };

  const handleCreateQuote = async () => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item à proposta");
      return;
    }

    await createQuote.mutateAsync({
      title: title || `Proposta - ${new Date().toLocaleDateString("pt-BR")}`,
      valid_until: validUntil || undefined,
      notes: notes || undefined,
    });

    navigate(`/crm/pipeline`);
  };

  const getApprovalBadge = (item: typeof items[0]) => {
    if (!item.discount_percent || item.discount_percent <= 10) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Auto-aprovado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-600">
        <Clock className="h-3 w-3 mr-1" />
        Requer Aprovação
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                CPQ - Montador de Proposta
              </h1>
              <p className="text-muted-foreground">
                Configure produtos, preços e impostos calculados automaticamente
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCreateQuote}
              disabled={createQuote.isPending || items.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button 
              onClick={handleCreateQuote}
              disabled={createQuote.isPending || items.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Criar Proposta
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Proposta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nome da proposta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Válida até</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Condições especiais, observações..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Add Product */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Adicionar Produto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Lista de Preços</Label>
                    <Select
                      value={selectedPriceBookId}
                      onValueChange={setSelectedPriceBookId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a lista" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceBooks.data?.map((book) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Produto</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                      disabled={!selectedPriceBookId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceBookItems.data?.map((item) => (
                          <SelectItem key={item.product_id} value={item.product_id}>
                            {item.product?.name} - {formatCurrency(item.unit_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                      <Button onClick={handleAddItem} disabled={!selectedProduct}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>Itens da Proposta ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum produto adicionado</p>
                    <p className="text-sm">Selecione uma lista de preços e adicione produtos</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Unit.</TableHead>
                        <TableHead className="text-right">Desc. %</TableHead>
                        <TableHead className="text-right">ICMS</TableHead>
                        <TableHead className="text-right">IPI</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product_name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.id!, { quantity: Number(e.target.value) })
                              }
                              className="w-20 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={item.discount_percent}
                                onChange={(e) =>
                                  updateItem(item.id!, {
                                    discount_percent: Number(e.target.value),
                                  })
                                }
                                className="w-16 text-right"
                              />
                              <Percent className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {item.taxes ? (
                              <span title={`${item.taxes.icms_rate}%`}>
                                {formatCurrency(item.taxes.icms)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {item.taxes ? (
                              <span title={`${item.taxes.ipi_rate}%`}>
                                {formatCurrency(item.taxes.ipi)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell>{getApprovalBadge(item)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id!)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Totals Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumo Fiscal
                </CardTitle>
                <CardDescription>
                  Impostos calculados automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Impostos
                  </div>
                  
                  {items.some((i) => i.taxes) && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ICMS (interno)</span>
                        <span>
                          {formatCurrency(
                            items.reduce((sum, i) => sum + (i.taxes?.icms || 0), 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">PIS</span>
                        <span>
                          {formatCurrency(
                            items.reduce((sum, i) => sum + (i.taxes?.pis || 0), 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">COFINS</span>
                        <span>
                          {formatCurrency(
                            items.reduce((sum, i) => sum + (i.taxes?.cofins || 0), 0)
                          )}
                        </span>
                      </div>
                    </>
                  )}
                  
                  <Separator />
                  
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Impostos adicionados ao total
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IPI</span>
                    <span>
                      {formatCurrency(
                        items.reduce((sum, i) => sum + (i.taxes?.ipi || 0), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ICMS-ST</span>
                    <span>
                      {formatCurrency(
                        items.reduce((sum, i) => sum + (i.taxes?.icms_st || 0), 0)
                      )}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(totals.totalWithTaxes)}
                    </span>
                  </div>
                </div>

                {items.some((i) => (i.discount_percent || 0) > 10) && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Aprovação Necessária
                      </p>
                      <p className="text-amber-700 dark:text-amber-300">
                        Itens com desconto acima de 10% requerem aprovação do gerente.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tax Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informações Fiscais</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>ICMS:</strong> Imposto sobre Circulação de Mercadorias (interno, não aumenta o total)
                </p>
                <p>
                  <strong>IPI:</strong> Imposto sobre Produtos Industrializados (adicionado ao total)
                </p>
                <p>
                  <strong>ICMS-ST:</strong> Substituição Tributária (adicionado ao total)
                </p>
                <p>
                  <strong>PIS/COFINS:</strong> Contribuições federais (interno, não aumenta o total)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
