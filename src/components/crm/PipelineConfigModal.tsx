import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePipelines, useStages, Pipeline, Stage } from "@/hooks/useCRM";
import { Plus, GripVertical, Trash2, Settings, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineConfigModalProps {
  open: boolean;
  onClose: () => void;
}

const STAGE_COLORS = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
];

export function PipelineConfigModal({ open, onClose }: PipelineConfigModalProps) {
  const { data: pipelines = [], createPipeline } = usePipelines();
  
  const [activeTab, setActiveTab] = useState("pipelines");
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  
  const [newPipeline, setNewPipeline] = useState({
    name: "",
    description: "",
    pipeline_type: "sales",
    won_action_type: "assisted",
    won_create_order: true,
    won_create_cashflow: true,
    won_create_stock_order: false,
    won_create_project: false,
  });

  const [newStage, setNewStage] = useState({
    name: "",
    stage_type: "open",
    probability: 50,
    rotting_days: 7,
    color: STAGE_COLORS[0],
  });

  const { data: stages = [], createStage } = useStages(selectedPipeline || undefined);

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipeline) {
      setSelectedPipeline(pipelines[0].id);
    }
  }, [pipelines, selectedPipeline]);

  const handleCreatePipeline = async () => {
    if (!newPipeline.name.trim()) return;
    setIsCreatingPipeline(true);
    
    try {
      await createPipeline.mutateAsync(newPipeline as Partial<Pipeline>);
      setNewPipeline({
        name: "",
        description: "",
        pipeline_type: "sales",
        won_action_type: "assisted",
        won_create_order: true,
        won_create_cashflow: true,
        won_create_stock_order: false,
        won_create_project: false,
      });
    } finally {
      setIsCreatingPipeline(false);
    }
  };

  const handleCreateStage = async () => {
    if (!newStage.name.trim() || !selectedPipeline) return;
    setIsCreatingStage(true);
    
    try {
      await createStage.mutateAsync({
        pipeline_id: selectedPipeline,
        name: newStage.name,
        stage_type: newStage.stage_type,
        probability: newStage.probability,
        rotting_days: newStage.rotting_days,
        color: newStage.color,
        sort_order: stages.length,
      });
      setNewStage({
        name: "",
        stage_type: "open",
        probability: 50,
        rotting_days: 7,
        color: STAGE_COLORS[stages.length % STAGE_COLORS.length],
      });
    } finally {
      setIsCreatingStage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Pipelines
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
            <TabsTrigger value="stages">Etapas</TabsTrigger>
            <TabsTrigger value="automation">Automação Won</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="pipelines" className="m-0">
              <div className="space-y-4">
                {/* Existing Pipelines */}
                <div className="grid gap-3">
                  {pipelines.map(pipeline => (
                    <Card 
                      key={pipeline.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedPipeline === pipeline.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedPipeline(pipeline.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{pipeline.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pipeline.description || pipeline.pipeline_type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {pipeline.is_default && (
                            <Badge variant="secondary">Padrão</Badge>
                          )}
                          <Badge variant="outline">
                            {pipeline.pipeline_type === 'sales' ? 'Vendas' : 
                             pipeline.pipeline_type === 'service' ? 'Serviços' : 
                             'Pós-venda'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* New Pipeline Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Novo Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={newPipeline.name}
                          onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
                          placeholder="Ex: Venda de Produtos"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={newPipeline.pipeline_type}
                          onValueChange={(v) => setNewPipeline({ ...newPipeline, pipeline_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales">Vendas</SelectItem>
                            <SelectItem value="service">Serviços</SelectItem>
                            <SelectItem value="post_sale">Pós-Venda</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={newPipeline.description}
                        onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
                        placeholder="Descrição do pipeline"
                        rows={2}
                      />
                    </div>
                    <Button 
                      onClick={handleCreatePipeline} 
                      disabled={!newPipeline.name.trim() || isCreatingPipeline}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isCreatingPipeline ? "Criando..." : "Criar Pipeline"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stages" className="m-0">
              <div className="space-y-4">
                {/* Pipeline Selector */}
                <Select value={selectedPipeline || ""} onValueChange={setSelectedPipeline}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Existing Stages */}
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <Card key={stage.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div 
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {stage.probability}% prob. | {stage.rotting_days || '∞'} dias
                          </p>
                        </div>
                        <Badge variant={
                          stage.stage_type === 'won' ? 'default' :
                          stage.stage_type === 'lost' ? 'destructive' :
                          'secondary'
                        }>
                          {stage.stage_type === 'won' ? 'Ganho' :
                           stage.stage_type === 'lost' ? 'Perdido' :
                           'Aberto'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* New Stage Form */}
                {selectedPipeline && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Nova Etapa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={newStage.name}
                            onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                            placeholder="Ex: Qualificação"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={newStage.stage_type}
                            onValueChange={(v) => setNewStage({ ...newStage, stage_type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Aberto</SelectItem>
                              <SelectItem value="won">Ganho (Won)</SelectItem>
                              <SelectItem value="lost">Perdido (Lost)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Probabilidade (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={newStage.probability}
                            onChange={(e) => setNewStage({ ...newStage, probability: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dias até "parado"</Label>
                          <Input
                            type="number"
                            min="1"
                            value={newStage.rotting_days}
                            onChange={(e) => setNewStage({ ...newStage, rotting_days: parseInt(e.target.value) || 7 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cor</Label>
                          <div className="flex gap-2">
                            {STAGE_COLORS.map(color => (
                              <button
                                key={color}
                                className={cn(
                                  "w-6 h-6 rounded-full transition-all",
                                  newStage.color === color && "ring-2 ring-offset-2 ring-primary"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => setNewStage({ ...newStage, color })}
                                type="button"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={handleCreateStage}
                        disabled={!newStage.name.trim() || isCreatingStage}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isCreatingStage ? "Criando..." : "Criar Etapa"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="automation" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Automação de Fechamento (Won)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Configure o que acontece automaticamente quando uma oportunidade é movida para "Ganho"
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Modo de Conversão</Label>
                      <Select
                        value={newPipeline.won_action_type}
                        onValueChange={(v) => setNewPipeline({ ...newPipeline, won_action_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual - Não converte automaticamente</SelectItem>
                          <SelectItem value="assisted">Assistido - Abre modal para revisar</SelectItem>
                          <SelectItem value="auto">Automático - Converte imediatamente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Criar Pedido de Venda</p>
                          <p className="text-sm text-muted-foreground">
                            Converte a proposta aceita em pedido
                          </p>
                        </div>
                        <Switch
                          checked={newPipeline.won_create_order}
                          onCheckedChange={(v) => setNewPipeline({ ...newPipeline, won_create_order: v })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Gerar Previsão no Fluxo de Caixa</p>
                          <p className="text-sm text-muted-foreground">
                            Inclui os valores no forecast financeiro
                          </p>
                        </div>
                        <Switch
                          checked={newPipeline.won_create_cashflow}
                          onCheckedChange={(v) => setNewPipeline({ ...newPipeline, won_create_cashflow: v })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Criar Ordem de Separação</p>
                          <p className="text-sm text-muted-foreground">
                            Para produtos: reserva no estoque
                          </p>
                        </div>
                        <Switch
                          checked={newPipeline.won_create_stock_order}
                          onCheckedChange={(v) => setNewPipeline({ ...newPipeline, won_create_stock_order: v })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Criar Projeto de Entrega</p>
                          <p className="text-sm text-muted-foreground">
                            Para serviços: inicia projeto automaticamente
                          </p>
                        </div>
                        <Switch
                          checked={newPipeline.won_create_project}
                          onCheckedChange={(v) => setNewPipeline({ ...newPipeline, won_create_project: v })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
