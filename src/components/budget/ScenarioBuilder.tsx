import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Sparkles,
  TrendingDown,
  TrendingUp,
  Target,
  Settings2,
} from 'lucide-react';
import { 
  useCreateBudgetScenario, 
  useBudgetScenarios,
  type AdjustmentRule, 
  type BudgetScenario 
} from '@/hooks/useBudgetAdvanced';

interface ScenarioBuilderProps {
  budgetId: string;
  onScenarioCreated?: () => void;
}

const PRESET_SCENARIOS = {
  pessimista: {
    name: 'Cenário Pessimista',
    description: 'Receita -30%, Despesas +15%',
    probability: 0.2,
    rules: [
      { target: 'revenue' as const, adjustment_type: 'percentage' as const, adjustment_value: -30 },
      { target: 'expense' as const, adjustment_type: 'percentage' as const, adjustment_value: 15 },
    ],
  },
  realista: {
    name: 'Cenário Realista',
    description: 'Baseado no histórico de 12 meses',
    probability: 0.6,
    rules: [
      { target: 'revenue' as const, adjustment_type: 'percentage' as const, adjustment_value: 0 },
      { target: 'expense' as const, adjustment_type: 'percentage' as const, adjustment_value: 0 },
    ],
  },
  otimista: {
    name: 'Cenário Otimista',
    description: 'Receita +20%, Despesas -10%',
    probability: 0.2,
    rules: [
      { target: 'revenue' as const, adjustment_type: 'percentage' as const, adjustment_value: 20 },
      { target: 'expense' as const, adjustment_type: 'percentage' as const, adjustment_value: -10 },
    ],
  },
};

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  pessimista: <TrendingDown className="h-4 w-4 text-destructive" />,
  realista: <Target className="h-4 w-4 text-primary" />,
  otimista: <TrendingUp className="h-4 w-4 text-success" />,
  custom: <Settings2 className="h-4 w-4" />,
};

export function ScenarioBuilder({ budgetId, onScenarioCreated }: ScenarioBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scenarioType, setScenarioType] = useState<BudgetScenario['scenario_type']>('custom');
  const [probability, setProbability] = useState(50);
  const [isTemplate, setIsTemplate] = useState(false);
  const [rules, setRules] = useState<AdjustmentRule[]>([]);

  const { data: existingScenarios = [] } = useBudgetScenarios(budgetId);
  const createScenario = useCreateBudgetScenario();

  const handlePresetSelect = (preset: keyof typeof PRESET_SCENARIOS) => {
    const config = PRESET_SCENARIOS[preset];
    setName(config.name);
    setDescription(config.description);
    setScenarioType(preset);
    setProbability(config.probability * 100);
    setRules(config.rules);
  };

  const addRule = () => {
    setRules([
      ...rules,
      { target: 'revenue', adjustment_type: 'percentage', adjustment_value: 0 },
    ]);
  };

  const updateRule = (index: number, field: keyof AdjustmentRule, value: unknown) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    await createScenario.mutateAsync({
      budget_id: budgetId,
      name,
      scenario_type: scenarioType,
      description,
      probability: probability / 100,
      adjustment_rules: rules,
      is_template: isTemplate,
    });
    setDialogOpen(false);
    resetForm();
    onScenarioCreated?.();
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setScenarioType('custom');
    setProbability(50);
    setIsTemplate(false);
    setRules([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Cenários
            </CardTitle>
            <CardDescription>
              Configure múltiplos cenários para análise de sensibilidade
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cenário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Cenário</DialogTitle>
                <DialogDescription>
                  Configure um novo cenário de orçamento
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Presets */}
                <div>
                  <Label className="mb-2 block">Presets Rápidos</Label>
                  <div className="flex gap-2">
                    {Object.entries(PRESET_SCENARIOS).map(([key, config]) => (
                      <Button
                        key={key}
                        variant={scenarioType === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePresetSelect(key as keyof typeof PRESET_SCENARIOS)}
                      >
                        {SCENARIO_ICONS[key]}
                        <span className="ml-1 capitalize">{key}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome do Cenário</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Cenário de Crise"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva as premissas do cenário..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Probability */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Probabilidade de Ocorrência</Label>
                    <span className="text-sm font-medium">{probability}%</span>
                  </div>
                  <Slider
                    value={[probability]}
                    onValueChange={([val]) => setProbability(val)}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>

                {/* Rules */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Regras de Ajuste</Label>
                    <Button variant="outline" size="sm" onClick={addRule}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {rules.map((rule, index) => (
                      <div key={index} className="flex gap-2 items-center p-3 border rounded-lg">
                        <Select
                          value={rule.target}
                          onValueChange={(val) => updateRule(index, 'target', val)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="revenue">Receita</SelectItem>
                            <SelectItem value="expense">Despesa</SelectItem>
                            <SelectItem value="account">Conta</SelectItem>
                            <SelectItem value="cost_center">Centro Custo</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={rule.adjustment_type}
                          onValueChange={(val) => updateRule(index, 'adjustment_type', val)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">Fixo</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          value={rule.adjustment_value}
                          onChange={(e) => updateRule(index, 'adjustment_value', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />

                        <span className="text-sm text-muted-foreground">
                          {rule.adjustment_type === 'percentage' ? '%' : 'R$'}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRule(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {rules.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma regra configurada. Adicione regras para definir os ajustes do cenário.
                      </p>
                    )}
                  </div>
                </div>

                {/* Template Option */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Salvar como Template</p>
                    <p className="text-sm text-muted-foreground">
                      Reutilize este cenário em outros orçamentos
                    </p>
                  </div>
                  <Switch checked={isTemplate} onCheckedChange={setIsTemplate} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!name || rules.length === 0 || createScenario.isPending}
                >
                  {createScenario.isPending ? 'Criando...' : 'Criar Cenário'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {existingScenarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum cenário configurado.</p>
            <p className="text-sm">Crie cenários para simular diferentes situações.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingScenarios.map((scenario) => (
              <Card key={scenario.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {SCENARIO_ICONS[scenario.scenario_type]}
                    <h4 className="font-semibold">{scenario.name}</h4>
                    {scenario.is_template && (
                      <Badge variant="secondary" className="text-xs">Template</Badge>
                    )}
                  </div>
                  {scenario.description && (
                    <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Probabilidade</span>
                    <Badge variant="outline">{(scenario.probability * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Regras</span>
                    <span>{scenario.adjustment_rules.length}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
