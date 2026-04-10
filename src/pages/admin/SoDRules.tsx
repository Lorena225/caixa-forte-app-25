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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSoDRules, useSoDViolations, useCreateSoDRule, useUpdateSoDRule, useResolveSoDViolation } from "@/hooks/useSoDRules";
import { Plus, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const RULE_TYPES = [
  { value: "permission_conflict", label: "Conflito de Permissões" },
  { value: "role_conflict", label: "Conflito de Papéis" },
  { value: "amount_threshold", label: "Limite de Valor" },
];

const ENFORCEMENT_MODES = [
  { value: "block", label: "Bloquear" },
  { value: "warn", label: "Alertar" },
  { value: "log", label: "Apenas Registrar" },
];

export default function SoDRulesPage() {
  const { data: rules, isLoading: loadingRules } = useSoDRules();
  const { data: violations, isLoading: loadingViolations } = useSoDViolations();
  const createRule = useCreateSoDRule();
  const updateRule = useUpdateSoDRule();
  const resolveViolation = useResolveSoDViolation();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [resolveReason, setResolveReason] = useState("");
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rule_type: "permission_conflict",
    permission_a: "",
    permission_b: "",
    enforcement_mode: "block",
    is_active: true,
  });

  const handleCreate = () => {
    createRule.mutate(formData as any, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setFormData({
          name: "",
          description: "",
          rule_type: "permission_conflict",
          permission_a: "",
          permission_b: "",
          enforcement_mode: "block",
          is_active: true,
        });
      }
    });
  };

  const handleResolve = () => {
    if (selectedViolation && resolveReason) {
      resolveViolation.mutate({ id: selectedViolation, reason: resolveReason }, {
        onSuccess: () => {
          setSelectedViolation(null);
          setResolveReason("");
        }
      });
    }
  };

  const pendingViolations = violations?.filter((v: any) => v.enforcement_result !== 'overridden') || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Segregação de Funções (SoD)"
          description="Regras de conflito e violações detectadas"
        >
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nova Regra SoD</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Aprovador não pode criar pagamento"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva a regra de conflito..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Regra</Label>
                    <Select value={formData.rule_type} onValueChange={(v) => setFormData({ ...formData, rule_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Permissão A</Label>
                      <Input
                        value={formData.permission_a}
                        onChange={(e) => setFormData({ ...formData, permission_a: e.target.value })}
                        placeholder="ap:create"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Permissão B</Label>
                      <Input
                        value={formData.permission_b}
                        onChange={(e) => setFormData({ ...formData, permission_b: e.target.value })}
                        placeholder="ap:approve"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Modo de Aplicação</Label>
                    <Select value={formData.enforcement_mode} onValueChange={(v) => setFormData({ ...formData, enforcement_mode: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENFORCEMENT_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createRule.isPending}>
                  Criar Regra
                </Button>
              </DialogContent>
            </Dialog>
          </PageHeader>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Regras Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {rules?.filter(r => r.is_active).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Violações Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {pendingViolations.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Violações Resolvidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {(violations?.length || 0) - pendingViolations.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Regras
            </TabsTrigger>
            <TabsTrigger value="violations" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Violações
              {pendingViolations.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingViolations.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loadingRules ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : rules?.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma regra cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Permissão A</TableHead>
                        <TableHead>Permissão B</TableHead>
                        <TableHead>Modo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules?.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{rule.name}</span>
                              {rule.description && (
                                <p className="text-xs text-muted-foreground">{rule.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {RULE_TYPES.find(t => t.value === rule.rule_type)?.label || rule.rule_type}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{rule.permission_a || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{rule.permission_b || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={rule.enforcement_mode === 'block' ? 'destructive' : 'secondary'}>
                              {ENFORCEMENT_MODES.find(m => m.value === rule.enforcement_mode)?.label || rule.enforcement_mode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={rule.is_active ? "default" : "secondary"}>
                              {rule.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) => {
                                updateRule.mutate({ id: rule.id, is_active: checked });
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

          <TabsContent value="violations" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loadingViolations ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : violations?.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma violação detectada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Regra</TableHead>
                        <TableHead>Ação Tentada</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {violations?.map((violation: any) => (
                        <TableRow key={violation.id}>
                          <TableCell>{format(new Date(violation.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="font-medium">{violation.sod_rules?.name || "-"}</TableCell>
                          <TableCell>{violation.action_attempted || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={violation.enforcement_result === 'overridden' ? 'secondary' : 'destructive'}>
                              {violation.enforcement_result || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {violation.enforcement_result !== 'overridden' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedViolation(violation.id)}
                                  >
                                    Resolver
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Resolver Violação</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                      <Label>Justificativa</Label>
                                      <Textarea
                                        value={resolveReason}
                                        onChange={(e) => setResolveReason(e.target.value)}
                                        placeholder="Descreva o motivo da exceção..."
                                      />
                                    </div>
                                  </div>
                                  <Button onClick={handleResolve} disabled={!resolveReason || resolveViolation.isPending}>
                                    Confirmar Resolução
                                  </Button>
                                </DialogContent>
                              </Dialog>
                            )}
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
