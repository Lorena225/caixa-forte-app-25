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
import { useUserAmountLimits, useCreateUserAmountLimit, useUpdateUserAmountLimit } from "@/hooks/useSoDRules";
import { Plus, DollarSign, User } from "lucide-react";
import { useState } from "react";

const ENTITY_TYPES = [
  { value: "ap", label: "Contas a Pagar (AP)" },
  { value: "ar", label: "Contas a Receber (AR)" },
  { value: "transfer", label: "Transferências" },
  { value: "all", label: "Todos" },
];

export default function UserLimitsPage() {
  const { data: limits, isLoading } = useUserAmountLimits();
  const createLimit = useCreateUserAmountLimit();
  const updateLimit = useUpdateUserAmountLimit();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    user_id: "",
    entity_type: "ap",
    single_limit: 10000,
    daily_limit: 50000,
    monthly_limit: 200000,
    requires_approval_above: 5000,
    is_active: true,
  });

  const handleCreate = () => {
    createLimit.mutate(formData as any, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setFormData({
          user_id: "",
          entity_type: "ap",
          single_limit: 10000,
          daily_limit: 50000,
          monthly_limit: 200000,
          requires_approval_above: 5000,
          is_active: true,
        });
      }
    });
  };

  const formatCurrency = (value: number | null) =>
    value != null
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
      : "-";

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Limites de Valores"
          description="Configurar limites de transação por usuário"
        >
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Limite
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Limite de Valor</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>ID do Usuário</Label>
                    <Input
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      placeholder="UUID do usuário"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Transação</Label>
                    <Select value={formData.entity_type} onValueChange={(v) => setFormData({ ...formData, entity_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Limite Único</Label>
                      <Input
                        type="number"
                        value={formData.single_limit}
                        onChange={(e) => setFormData({ ...formData, single_limit: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Limite Diário</Label>
                      <Input
                        type="number"
                        value={formData.daily_limit}
                        onChange={(e) => setFormData({ ...formData, daily_limit: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Limite Mensal</Label>
                      <Input
                        type="number"
                        value={formData.monthly_limit}
                        onChange={(e) => setFormData({ ...formData, monthly_limit: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Aprovação acima de</Label>
                      <Input
                        type="number"
                        value={formData.requires_approval_above}
                        onChange={(e) => setFormData({ ...formData, requires_approval_above: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createLimit.isPending}>
                  Criar Limite
                </Button>
              </DialogContent>
            </Dialog>
          </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Limites Configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : limits?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum limite configurado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Limite Único</TableHead>
                    <TableHead>Limite Diário</TableHead>
                    <TableHead>Limite Mensal</TableHead>
                    <TableHead>Aprovação Acima</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {limits?.map((limit) => (
                    <TableRow key={limit.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-xs">{limit.user_id.substring(0, 8)}...</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ENTITY_TYPES.find(t => t.value === limit.entity_type)?.label || limit.entity_type}
                      </TableCell>
                      <TableCell>{formatCurrency(limit.single_limit)}</TableCell>
                      <TableCell>{formatCurrency(limit.daily_limit)}</TableCell>
                      <TableCell>{formatCurrency(limit.monthly_limit)}</TableCell>
                      <TableCell>{formatCurrency(limit.requires_approval_above)}</TableCell>
                      <TableCell>
                        <Badge variant={limit.is_active ? "default" : "secondary"}>
                          {limit.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={limit.is_active}
                          onCheckedChange={(checked) => {
                            updateLimit.mutate({ id: limit.id, is_active: checked });
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
      </div>
    </MainLayout>
  );
}
