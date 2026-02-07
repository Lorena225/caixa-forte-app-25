import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Loader2 } from "lucide-react";
import { useCreateProject, useCompanyUsers, Project } from "@/hooks/useProjects";
import { useContracts, Contract } from "@/hooks/useContracts";
import { format } from "date-fns";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId?: string; // Para criar projeto a partir de contrato
  contract?: Contract;
}

export function ProjectFormDialog({ open, onOpenChange, contractId, contract }: ProjectFormDialogProps) {
  const createMutation = useCreateProject();
  const { data: contracts } = useContracts({ status: 'ativo' });
  const { data: users } = useCompanyUsers();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contract_id: contractId || "",
    counterparty_id: "",
    manager_id: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    deadline: "",
    budget_hours: 0,
    budget_amount: 0,
    status: 'planejamento' as const,
    priority: 'media' as const,
    progress_percentage: 0,
  });

  // Atualizar dados quando contrato for selecionado
  useEffect(() => {
    if (contractId && contract) {
      setFormData(prev => ({
        ...prev,
        contract_id: contractId,
        counterparty_id: contract.counterparty_id,
        name: `Projeto - ${contract.counterparty?.name || contract.contract_number}`,
        budget_amount: Number(contract.valor_total || contract.monthly_value || 0),
      }));
    }
  }, [contractId, contract]);

  const handleContractChange = (value: string) => {
    setFormData(prev => ({ ...prev, contract_id: value }));
    const selectedContract = contracts?.find(c => c.id === value);
    if (selectedContract) {
      setFormData(prev => ({
        ...prev,
        counterparty_id: selectedContract.counterparty_id,
        budget_amount: Number(selectedContract.valor_total || selectedContract.monthly_value || 0),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createMutation.mutateAsync({
      ...formData,
      contract_id: formData.contract_id || undefined,
      counterparty_id: formData.counterparty_id || undefined,
      manager_id: formData.manager_id || undefined,
      deadline: formData.deadline || undefined,
    });
    
    onOpenChange(false);
    // Reset form
    setFormData({
      name: "",
      description: "",
      contract_id: "",
      counterparty_id: "",
      manager_id: "",
      start_date: format(new Date(), 'yyyy-MM-dd'),
      deadline: "",
      budget_hours: 0,
      budget_amount: 0,
      status: 'planejamento',
      priority: 'media',
      progress_percentage: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contractId ? 'Criar Projeto de Entrega' : 'Novo Projeto'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure as informações do projeto e defina o responsável.
          </p>
        </DialogHeader>
        
        <TooltipProvider>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Implementação ERP - Cliente ABC"
                required
              />
            </div>

            {/* Contrato Vinculado */}
            {!contractId && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Contrato Vinculado</Label>
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Vincule a um contrato existente para herdar cliente e orçamento automaticamente.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select 
                  value={formData.contract_id} 
                  onValueChange={handleContractChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contrato (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {contracts?.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.contract_number} - {contract.counterparty?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Gerente do Projeto */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Gerente do Projeto *</Label>
                <Tooltip>
                  <TooltipTrigger type="button">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Responsável pela gestão e entrega do projeto.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select 
                value={formData.manager_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, manager_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gerente" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="deadline">Prazo Final</Label>
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Data limite para conclusão do projeto</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>

            {/* Orçamento */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium">Orçamento do Projeto</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="budget_hours">Horas Orçadas</Label>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Total de horas previstas para entrega do projeto. Usado para controle de rentabilidade.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="budget_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.budget_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="budget_amount">Valor do Projeto (R$)</Label>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Valor total do projeto. Herdado automaticamente do contrato, se vinculado.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="budget_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v: any) => setFormData(prev => ({ ...prev, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o escopo e objetivos do projeto"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.name}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Projeto
              </Button>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
