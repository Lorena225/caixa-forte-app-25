import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCardMerchants, useCardReceivables, useCardSettlements, useCreateCardMerchant, useUpdateCardMerchant } from "@/hooks/useCardManagement";
import { Plus, CreditCard, Building2, DollarSign, TrendingUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const MERCHANT_TYPES = [
  { value: "acquirer", label: "Adquirente (Cielo, Rede, Stone)" },
  { value: "subacquirer", label: "Subadquirente (PagSeguro, Mercado Pago)" },
  { value: "gateway", label: "Gateway" },
];

export default function CardsManagementPage() {
  const { data: merchants, isLoading: loadingMerchants } = useCardMerchants();
  const { data: receivables, isLoading: loadingReceivables } = useCardReceivables();
  const { data: settlements, isLoading: loadingSettlements } = useCardSettlements();
  const createMerchant = useCreateCardMerchant();
  const updateMerchant = useUpdateCardMerchant();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    merchant_type: "acquirer",
    merchant_id: "",
    default_mdr_credit: 2.5,
    default_mdr_debit: 1.5,
    default_mdr_installment: 3.5,
  });

  const handleCreate = () => {
    createMerchant.mutate(formData as any, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setFormData({
          name: "",
          merchant_type: "acquirer",
          merchant_id: "",
          default_mdr_credit: 2.5,
          default_mdr_debit: 1.5,
          default_mdr_installment: 3.5,
        });
      }
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatPercent = (value: number | null) =>
    value != null ? `${value.toFixed(2)}%` : "-";

  // Calculate summary
  const pendingReceivables = receivables?.filter((r: any) => r.status === 'pending') || [];
  const totalPending = pendingReceivables.reduce((sum: number, r: any) => sum + (r.net_amount || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Gestão de Cartões"
          description="Credenciadoras, recebíveis e liquidações"
        >
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Credenciadora
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Credenciadora</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Cielo Principal"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select value={formData.merchant_type} onValueChange={(v) => setFormData({ ...formData, merchant_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MERCHANT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>ID do Estabelecimento</Label>
                    <Input
                      value={formData.merchant_id}
                      onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid gap-2">
                      <Label>MDR Crédito</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.default_mdr_credit}
                        onChange={(e) => setFormData({ ...formData, default_mdr_credit: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>MDR Débito</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.default_mdr_debit}
                        onChange={(e) => setFormData({ ...formData, default_mdr_debit: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>MDR Parcelado</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.default_mdr_installment}
                        onChange={(e) => setFormData({ ...formData, default_mdr_installment: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createMerchant.isPending}>
                  Criar Credenciadora
                </Button>
              </DialogContent>
            </Dialog>
          </PageHeader>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credenciadoras Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {merchants?.filter(m => m.is_active).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recebíveis Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
              <p className="text-xs text-muted-foreground">{pendingReceivables.length} parcelas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Liquidações do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{settlements?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="merchants">
          <TabsList>
            <TabsTrigger value="merchants" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Credenciadoras
            </TabsTrigger>
            <TabsTrigger value="receivables" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recebíveis
            </TabsTrigger>
            <TabsTrigger value="settlements" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Liquidações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merchants" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loadingMerchants ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : merchants?.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma credenciadora cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>ID Estabelecimento</TableHead>
                        <TableHead>MDR Crédito</TableHead>
                        <TableHead>MDR Débito</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants?.map((merchant) => (
                        <TableRow key={merchant.id}>
                          <TableCell className="font-medium">{merchant.name}</TableCell>
                          <TableCell>
                            {MERCHANT_TYPES.find(t => t.value === merchant.merchant_type)?.label || merchant.merchant_type}
                          </TableCell>
                          <TableCell className="font-mono">{merchant.merchant_id || "-"}</TableCell>
                          <TableCell>{formatPercent(merchant.default_mdr_credit)}</TableCell>
                          <TableCell>{formatPercent(merchant.default_mdr_debit)}</TableCell>
                          <TableCell>
                            <Badge variant={merchant.is_active ? "default" : "secondary"}>
                              {merchant.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={merchant.is_active}
                              onCheckedChange={(checked) => {
                                updateMerchant.mutate({ id: merchant.id, is_active: checked });
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receivables" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loadingReceivables ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : receivables?.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum recebível encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Previsão</TableHead>
                        <TableHead>Bandeira</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Bruto</TableHead>
                        <TableHead>MDR</TableHead>
                        <TableHead>Líquido</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivables?.slice(0, 100).map((receivable: any) => (
                        <TableRow key={receivable.id}>
                          <TableCell>{format(new Date(receivable.expected_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{receivable.card_sales?.card_brand || "-"}</TableCell>
                          <TableCell>{receivable.installment_number}</TableCell>
                          <TableCell>{formatCurrency(receivable.gross_amount)}</TableCell>
                          <TableCell className="text-destructive">{formatCurrency(receivable.mdr_amount)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(receivable.net_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={receivable.status === 'settled' ? 'default' : 'secondary'}>
                              {receivable.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settlements" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loadingSettlements ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : settlements?.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma liquidação encontrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Credenciadora</TableHead>
                        <TableHead>Bruto</TableHead>
                        <TableHead>MDR</TableHead>
                        <TableHead>Líquido</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Conciliado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements?.map((settlement: any) => (
                        <TableRow key={settlement.id}>
                          <TableCell>{format(new Date(settlement.settlement_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{settlement.card_merchants?.name || "-"}</TableCell>
                          <TableCell>{formatCurrency(settlement.gross_amount)}</TableCell>
                          <TableCell className="text-destructive">{formatCurrency(settlement.mdr_amount)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(settlement.net_amount)}</TableCell>
                          <TableCell>{settlement.receivable_count}</TableCell>
                          <TableCell>
                            <Badge variant={settlement.is_reconciled ? "default" : "secondary"}>
                              {settlement.is_reconciled ? "Sim" : "Não"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
