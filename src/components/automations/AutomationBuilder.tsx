import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  TestTube, 
  Save, 
  Zap, 
  Target,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { 
  AutomationTrigger, 
  AutomationAction,
  AutomationTriggerType,
  AutomationActionType,
  TRIGGER_LABELS,
  TRIGGER_ICONS,
  ACTION_LABELS,
  ACTION_ICONS,
  CreateAutomationData,
} from '@/types/automations';

interface AutomationBuilderProps {
  initialData?: {
    name: string;
    description?: string;
    is_active: boolean;
    triggers: AutomationTrigger[];
    actions: AutomationAction[];
  };
  onSave: (data: CreateAutomationData) => void;
  onTest?: () => Promise<{ success: boolean; message: string }>;
  isSaving?: boolean;
  isTesting?: boolean;
}

const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string; icon: string }[] = [
  { value: 'conta_criada', label: TRIGGER_LABELS.conta_criada, icon: TRIGGER_ICONS.conta_criada },
  { value: 'conta_vencida', label: TRIGGER_LABELS.conta_vencida, icon: TRIGGER_ICONS.conta_vencida },
  { value: 'conta_paga', label: TRIGGER_LABELS.conta_paga, icon: TRIGGER_ICONS.conta_paga },
  { value: 'orcamento_criado', label: TRIGGER_LABELS.orcamento_criado, icon: TRIGGER_ICONS.orcamento_criado },
  { value: 'orcamento_excedido', label: TRIGGER_LABELS.orcamento_excedido, icon: TRIGGER_ICONS.orcamento_excedido },
  { value: 'fluxo_negativo', label: TRIGGER_LABELS.fluxo_negativo, icon: TRIGGER_ICONS.fluxo_negativo },
  { value: 'data_fixa', label: TRIGGER_LABELS.data_fixa, icon: TRIGGER_ICONS.data_fixa },
  { value: 'webhook', label: TRIGGER_LABELS.webhook, icon: TRIGGER_ICONS.webhook },
];

const ACTION_OPTIONS: { value: AutomationActionType; label: string; icon: string }[] = [
  { value: 'enviar_email', label: ACTION_LABELS.enviar_email, icon: ACTION_ICONS.enviar_email },
  { value: 'criar_tarefa', label: ACTION_LABELS.criar_tarefa, icon: ACTION_ICONS.criar_tarefa },
  { value: 'atualizar_status', label: ACTION_LABELS.atualizar_status, icon: ACTION_ICONS.atualizar_status },
  { value: 'notificar_usuario', label: ACTION_LABELS.notificar_usuario, icon: ACTION_ICONS.notificar_usuario },
  { value: 'webhook_call', label: ACTION_LABELS.webhook_call, icon: ACTION_ICONS.webhook_call },
  { value: 'gerar_relatorio', label: ACTION_LABELS.gerar_relatorio, icon: ACTION_ICONS.gerar_relatorio },
];

// Helper to safely get schedule value
function getScheduleValue(trigger: AutomationTrigger, field: string): string {
  if (trigger.schedule && typeof trigger.schedule === 'string') {
    // Try to parse as JSON if it contains field
    try {
      const parsed = JSON.parse(trigger.schedule);
      if (typeof parsed === 'object' && parsed[field]) {
        return String(parsed[field]);
      }
    } catch {
      // Not JSON, return as-is for time field
      if (field === 'time') return trigger.schedule;
    }
  }
  return field === 'time' ? '09:00' : '0';
}

// Helper to get condition value
function getConditionValue(trigger: AutomationTrigger, field: string): string {
  const condition = trigger.conditions?.find(c => c.field === field);
  return condition ? String(condition.value) : '';
}

export function AutomationBuilder({
  initialData,
  onSave,
  onTest,
  isSaving,
  isTesting,
}: AutomationBuilderProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [triggers, setTriggers] = useState<AutomationTrigger[]>(
    initialData?.triggers || [{ type: 'conta_vencida' }]
  );
  const [actions, setActions] = useState<AutomationAction[]>(
    initialData?.actions || []
  );
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const addTrigger = () => {
    setTriggers([...triggers, { type: 'conta_criada' }]);
  };

  const removeTrigger = (index: number) => {
    setTriggers(triggers.filter((_, i) => i !== index));
  };

  const updateTrigger = (index: number, updates: Partial<AutomationTrigger>) => {
    setTriggers(triggers.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  };

  const updateTriggerCondition = (index: number, field: string, value: string | number) => {
    const trigger = triggers[index];
    const existingConditions = trigger.conditions || [];
    const conditionIndex = existingConditions.findIndex(c => c.field === field);
    
    let newConditions;
    if (conditionIndex >= 0) {
      newConditions = existingConditions.map((c, i) => 
        i === conditionIndex ? { ...c, value } : c
      );
    } else {
      newConditions = [...existingConditions, { field, operator: 'gte' as const, value }];
    }
    
    updateTrigger(index, { conditions: newConditions });
  };

  const addAction = () => {
    setActions([...actions, { type: 'notificar_usuario', target: '' }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<AutomationAction>) => {
    setActions(actions.map((a, i) => (i === index ? { ...a, ...updates } : a)));
  };

  const handleTest = async () => {
    if (onTest) {
      const result = await onTest();
      setTestResult(result);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const handleSave = () => {
    onSave({
      name,
      description: description || undefined,
      is_active: isActive,
      triggers,
      actions,
    });
  };

  const isValid = name.trim() && triggers.length > 0 && actions.length > 0;

  // Generate preview text
  const generatePreview = () => {
    if (triggers.length === 0 || actions.length === 0) return null;

    const triggerText = triggers
      .map(t => TRIGGER_LABELS[t.type])
      .join(' ou ');
    
    const actionText = actions
      .map(a => ACTION_LABELS[a.type])
      .join(', ');

    return `Quando "${triggerText}", execute: ${actionText}`;
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Automação *</Label>
              <Input
                id="name"
                placeholder="Ex: Alerta de contas vencidas"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between space-x-2 pt-6">
              <Label htmlFor="is-active">Automação Ativa</Label>
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o que esta automação faz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Triggers (O que vai disparar)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addTrigger}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Trigger
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {triggers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Adicione pelo menos um trigger para esta automação
            </p>
          ) : (
            triggers.map((trigger, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Trigger {index + 1}</Badge>
                  </div>
                  <Select
                    value={trigger.type}
                    onValueChange={(value: AutomationTriggerType) => 
                      updateTrigger(index, { type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Conditional fields based on trigger type */}
                  {trigger.type === 'data_fixa' && (
                    <div className="grid gap-2">
                      <Label>Horário de execução</Label>
                      <Input
                        type="time"
                        value={getScheduleValue(trigger, 'time')}
                        onChange={(e) => 
                          updateTrigger(index, { schedule: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {trigger.type === 'orcamento_excedido' && (
                    <div className="grid gap-2">
                      <Label>Percentual mínimo excedido</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={getConditionValue(trigger, 'minPercentage') || '10'}
                          onChange={(e) => 
                            updateTriggerCondition(index, 'minPercentage', Number(e.target.value))
                          }
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  )}

                  {trigger.type === 'conta_vencida' && (
                    <div className="grid gap-2">
                      <Label>Dias de atraso mínimo</Label>
                      <Input
                        type="number"
                        min={0}
                        value={getConditionValue(trigger, 'minDaysOverdue') || '0'}
                        onChange={(e) => 
                          updateTriggerCondition(index, 'minDaysOverdue', Number(e.target.value))
                        }
                      />
                    </div>
                  )}
                </div>
                {triggers.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeTrigger(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Ações (O que vai fazer)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addAction}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Ação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Adicione pelo menos uma ação para esta automação
            </p>
          ) : (
            actions.map((action, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Ação {index + 1}</Badge>
                  </div>
                  <Select
                    value={action.type}
                    onValueChange={(value: AutomationActionType) => 
                      updateAction(index, { type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a ação" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Conditional fields based on action type */}
                  {action.type === 'enviar_email' && (
                    <>
                      <div className="grid gap-2">
                        <Label>E-mail destinatário</Label>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          value={action.target || ''}
                          onChange={(e) => updateAction(index, { target: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Template do e-mail</Label>
                        <Select
                          value={action.template || ''}
                          onValueChange={(value) => updateAction(index, { template: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conta_vencida">Conta Vencida</SelectItem>
                            <SelectItem value="orcamento_excedido">Orçamento Excedido</SelectItem>
                            <SelectItem value="relatorio_mensal">Relatório Mensal</SelectItem>
                            <SelectItem value="alerta_fluxo">Alerta de Fluxo</SelectItem>
                            <SelectItem value="custom">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {action.type === 'notificar_usuario' && (
                    <div className="grid gap-2">
                      <Label>ID do usuário ou "all" para todos</Label>
                      <Input
                        placeholder="ID do usuário ou 'all'"
                        value={action.target || ''}
                        onChange={(e) => updateAction(index, { target: e.target.value })}
                      />
                    </div>
                  )}

                  {action.type === 'webhook_call' && (
                    <div className="grid gap-2">
                      <Label>URL do Webhook</Label>
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={action.target || ''}
                        onChange={(e) => updateAction(index, { target: e.target.value })}
                      />
                    </div>
                  )}

                  {action.type === 'criar_tarefa' && (
                    <>
                      <div className="grid gap-2">
                        <Label>Título da tarefa</Label>
                        <Input
                          placeholder="Ex: Verificar conta {conta.descricao}"
                          value={String(action.params?.title || '')}
                          onChange={(e) => 
                            updateAction(index, { 
                              params: { ...action.params, title: e.target.value } 
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Atribuir para (ID do usuário)</Label>
                        <Input
                          placeholder="ID do usuário"
                          value={action.target || ''}
                          onChange={(e) => updateAction(index, { target: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {action.type === 'gerar_relatorio' && (
                    <div className="grid gap-2">
                      <Label>Tipo de relatório</Label>
                      <Select
                        value={String(action.params?.reportType || '')}
                        onValueChange={(value) => 
                          updateAction(index, { 
                            params: { ...action.params, reportType: value } 
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o relatório" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dre">DRE</SelectItem>
                          <SelectItem value="fluxo_caixa">Fluxo de Caixa</SelectItem>
                          <SelectItem value="aging">Aging</SelectItem>
                          <SelectItem value="orcamento_realizado">Orçado x Realizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeAction(index)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {generatePreview() && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Preview da automação:</p>
                <p className="text-sm text-muted-foreground">{generatePreview()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Result */}
      {testResult && (
        <Card className={testResult.success ? 'border-green-500/50' : 'border-destructive/50'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onTest && (
          <Button 
            variant="outline" 
            onClick={handleTest}
            disabled={!isValid || isTesting}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Testar
          </Button>
        )}
        <Button 
          onClick={handleSave}
          disabled={!isValid || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Automação
        </Button>
      </div>
    </div>
  );
}
