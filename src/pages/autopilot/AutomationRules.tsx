import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAutomationRules, useCreateAutomationRule, useUpdateAutomationRule, useDeleteAutomationRule } from "@/hooks/useAutomationRules";
import { Zap, Plus, Trash2, Edit, ArrowRight, Target, Hash, Type } from "lucide-react";
import { toast } from "sonner";

export default function AutomationRules() {
  const { data: rules, isLoading } = useAutomationRules();
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rule_type: "categorization",
    pattern: "",
    pattern_type: "contains",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      rule_type: "categorization",
      pattern: "",
      pattern_type: "contains",
    });
    setEditingRule(null);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.pattern) {
      toast.error("Preencha nome e padrão");
      return;
    }

    try {
      await createRule.mutateAsync({
        name: formData.name,
        description: formData.description,
        rule_type: formData.rule_type,
        pattern: formData.pattern,
        pattern_type: formData.pattern_type,
        action_json: {},
      });
      toast.success("Regra criada com sucesso");
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erro ao criar regra");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateRule.mutateAsync({ id, is_active: isActive });
      toast.success(isActive ? "Regra ativada" : "Regra desativada");
    } catch (error) {
      toast.error("Erro ao atualizar regra");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule.mutateAsync(id);
      toast.success("Regra removida");
    } catch (error) {
      toast.error("Erro ao remover regra");
    }
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "categorization":
        return <Target className="h-4 w-4" />;
      case "counterparty":
        return <Type className="h-4 w-4" />;
      case "cost_center":
        return <Hash className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case "categorization":
        return <Badge variant="outline">Categorização</Badge>;
      case "counterparty":
        return <Badge variant="secondary">Contraparte</Badge>;
      case "cost_center":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Centro de Custo</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getPatternTypeBadge = (type: string) => {
    switch (type) {
      case "contains":
        return <Badge variant="outline" className="text-xs">contém</Badge>;
      case "regex":
        return <Badge variant="outline" className="text-xs">regex</Badge>;
      case "exact":
        return <Badge variant="outline" className="text-xs">exato</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Regras de Automação"
          description="Configure regras para categorização e processamento automático"
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Regras Ativas
              </CardTitle>
              <CardDescription>
                Regras são aplicadas em ordem de prioridade
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? "Editar Regra" : "Nova Regra de Automação"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Nome da Regra</Label>
                    <Input
                      placeholder="Ex: Categorizar ENEL como Energia"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      placeholder="Descreva o que essa regra faz"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Regra</Label>
                      <Select
                        value={formData.rule_type}
                        onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="categorization">Categorização</SelectItem>
                          <SelectItem value="counterparty">Contraparte</SelectItem>
                          <SelectItem value="cost_center">Centro de Custo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Padrão</Label>
                      <Select
                        value={formData.pattern_type}
                        onValueChange={(value) => setFormData({ ...formData, pattern_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contém</SelectItem>
                          <SelectItem value="exact">Exato</SelectItem>
                          <SelectItem value="regex">Regex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Padrão de Busca</Label>
                    <Input
                      placeholder="Ex: ENEL, energia, luz"
                      value={formData.pattern}
                      onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Para múltiplos padrões, separe por vírgula
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreate}
                    disabled={createRule.isPending}
                  >
                    {createRule.isPending ? "Salvando..." : "Salvar Regra"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !rules?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma regra configurada</p>
                <p className="text-sm">Crie regras para automatizar a categorização</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      rule.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-3">
                        {getRuleTypeIcon(rule.rule_type)}
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {rule.pattern}
                            </code>
                            {getPatternTypeBadge(rule.pattern_type)}
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            {getRuleTypeBadge(rule.rule_type)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{rule.hit_count} usos</p>
                        <p className="text-xs">
                          {rule.source === "ai_feedback" ? "Criada por IA" : "Manual"}
                        </p>
                      </div>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
