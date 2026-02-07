import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Loader2 } from "lucide-react";
import { useCreateContract } from "@/hooks/useContracts";
import { useCounterparties } from "@/hooks/useCompanyData";
import { format } from "date-fns";

type AdjustmentIndex = "IGPM" | "IPCA" | "INPC" | "SELIC" | "MANUAL";

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractFormDialog({ open, onOpenChange }: ContractFormDialogProps) {
  const createMutation = useCreateContract();
  const { data: counterparties } = useCounterparties();
  
  // Filter only clients
  const clients = counterparties?.filter(cp => cp.is_client) || [];
  
  const [formData, setFormData] = useState({
    counterparty_id: "",
    description: "",
    tipo: "cliente" as const,
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: "",
    billing_cycle: "mensal" as const,
    billing_day: 5,
    monthly_value: 0,
    auto_adjustment: false,
    adjustment_index: undefined as AdjustmentIndex | undefined,
    auto_generate_billing: true,
    renovacao_automatica: false,
    alertar_antes_dias: 30,
    observacoes: "",
    condicoes_comerciais_json: {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createMutation.mutateAsync({
      ...formData,
      status: 'ativo',
      valor_total: formData.monthly_value,
      adjustment_index: formData.adjustment_index || undefined,
    });
    
    onOpenChange(false);
    // Reset form
    setFormData({
      counterparty_id: "",
      description: "",
      tipo: "cliente",
      data_inicio: format(new Date(), 'yyyy-MM-dd'),
      data_fim: "",
      billing_cycle: "mensal",
      billing_day: 5,
      monthly_value: 0,
      auto_adjustment: false,
      adjustment_index: undefined,
      auto_generate_billing: true,
      renovacao_automatica: false,
      alertar_antes_dias: 30,
      observacoes: "",
      condicoes_comerciais_json: {},
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato de Recorrência</DialogTitle>
        </DialogHeader>
        
        <TooltipProvider>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="counterparty_id">Cliente *</Label>
              <Select 
                value={formData.counterparty_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, counterparty_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.name} {cp.document && `(${cp.document})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Contrato</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Assinatura mensal do plano Pro"
                rows={2}
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início *</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="data_fim">Data de Término</Label>
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Deixe em branco para contratos por tempo indeterminado</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                />
              </div>
            </div>

            {/* Faturamento */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium">Configuração de Faturamento</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="monthly_value">Valor Mensal *</Label>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Valor base que será cobrado a cada período</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="monthly_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_value: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
                  <Select 
                    value={formData.billing_cycle} 
                    onValueChange={(v: any) => setFormData(prev => ({ ...prev, billing_cycle: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="bimestral">Bimestral</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="billing_day">Dia do Vencimento</Label>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Dia do mês para vencimento das cobranças (1-28)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="billing_day"
                    type="number"
                    min="1"
                    max="28"
                    value={formData.billing_day}
                    onChange={(e) => setFormData(prev => ({ ...prev, billing_day: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto_generate_billing"
                    checked={formData.auto_generate_billing}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_generate_billing: checked }))}
                  />
                  <Label htmlFor="auto_generate_billing" className="cursor-pointer">
                    Gerar faturamento automaticamente
                  </Label>
                </div>
              </div>
            </div>

            {/* Reajuste */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Reajuste Automático</h4>
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Configure o reajuste anual automático baseado em índices econômicos como IGPM ou IPCA</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={formData.auto_adjustment}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_adjustment: checked }))}
                />
              </div>
              
              {formData.auto_adjustment && (
                <div className="space-y-2">
                  <Label>Índice de Reajuste</Label>
                  <Select 
                    value={formData.adjustment_index} 
                    onValueChange={(v: AdjustmentIndex) => setFormData(prev => ({ ...prev, adjustment_index: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o índice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IGPM">IGPM (Índice Geral de Preços)</SelectItem>
                      <SelectItem value="IPCA">IPCA (Índice de Preços ao Consumidor)</SelectItem>
                      <SelectItem value="INPC">INPC (Índice Nacional de Preços)</SelectItem>
                      <SelectItem value="MANUAL">Manual (definir valor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Notas internas sobre o contrato"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.counterparty_id}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Contrato
              </Button>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
