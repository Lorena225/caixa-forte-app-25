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
import { useCNABAgreements, useCNABRemittances, useCreateCNABAgreement, useUpdateCNABAgreement } from "@/hooks/useCNAB";
import { Plus, FileText, Building2, Send } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const BANK_CODES = [
  { code: "001", name: "Banco do Brasil" },
  { code: "033", name: "Santander" },
  { code: "104", name: "Caixa Econômica" },
  { code: "237", name: "Bradesco" },
  { code: "341", name: "Itaú" },
  { code: "756", name: "Sicoob" },
];

const LAYOUTS = ["240", "400"];

export default function CNABPage() {
  const { data: agreements, isLoading: loadingAgreements } = useCNABAgreements();
  const { data: remittances, isLoading: loadingRemittances } = useCNABRemittances();
  const createAgreement = useCreateCNABAgreement();
  const updateAgreement = useUpdateCNABAgreement();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bank_code: "",
    agreement_number: "",
    wallet_code: "",
    layout: "240",
  });

  const handleCreate = () => {
    createAgreement.mutate(formData as any, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setFormData({ name: "", bank_code: "", agreement_number: "", wallet_code: "", layout: "240" });
      }
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="CNAB"
          description="Convênios bancários e remessas CNAB 240/400"
        >
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Convênio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Convênio CNAB</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Cobrança Itaú"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Banco</Label>
                    <Select value={formData.bank_code} onValueChange={(v) => setFormData({ ...formData, bank_code: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANK_CODES.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.code} - {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Número do Convênio</Label>
                    <Input
                      value={formData.agreement_number}
                      onChange={(e) => setFormData({ ...formData, agreement_number: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Carteira</Label>
                    <Input
                      value={formData.wallet_code}
                      onChange={(e) => setFormData({ ...formData, wallet_code: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Layout</Label>
                    <Select value={formData.layout} onValueChange={(v) => setFormData({ ...formData, layout: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LAYOUTS.map((layout) => (
                          <SelectItem key={layout} value={layout}>
                            CNAB {layout}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createAgreement.isPending}>
                  Criar Convênio
                </Button>
              </DialogContent>
            </Dialog>
          </PageHeader>

        <Tabs defaultValue="agreements">
          <TabsList>
            <TabsTrigger value="agreements" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Convênios
            </TabsTrigger>
            <TabsTrigger value="remittances" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Remessas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agreements" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loadingAgreements ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : agreements?.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum convênio cadastrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Carteira</TableHead>
                        <TableHead>Layout</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agreements?.map((agreement) => {
                        const bank = BANK_CODES.find(b => b.code === agreement.bank_code);
                        return (
                          <TableRow key={agreement.id}>
                            <TableCell className="font-medium">{agreement.name}</TableCell>
                            <TableCell>{bank?.name || agreement.bank_code}</TableCell>
                            <TableCell>{agreement.agreement_number}</TableCell>
                            <TableCell>{agreement.wallet_code || "-"}</TableCell>
                            <TableCell>CNAB {agreement.layout}</TableCell>
                            <TableCell>
                              <Badge variant={agreement.is_active ? "default" : "secondary"}>
                                {agreement.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={agreement.is_active}
                                onCheckedChange={(checked) => {
                                  updateAgreement.mutate({ id: agreement.id, is_active: checked });
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="remittances" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loadingRemittances ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : remittances?.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma remessa gerada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {remittances?.map((remittance: any) => (
                        <TableRow key={remittance.id}>
                          <TableCell>{format(new Date(remittance.generated_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>{remittance.cnab_agreements?.name || "-"}</TableCell>
                          <TableCell>{remittance.remittance_type}</TableCell>
                          <TableCell>{remittance.record_count}</TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(remittance.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={remittance.status === "sent" ? "default" : "secondary"}>
                              {remittance.status}
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
