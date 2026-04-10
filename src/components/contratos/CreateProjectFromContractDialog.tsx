import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Calendar, Users, DollarSign, Clock, HelpCircle, Zap } from "lucide-react";
import { useCreateProject, useCompanyUsers } from "@/hooks/useProjects";
import { Contract } from "@/hooks/useContracts";
import { format, addMonths } from "date-fns";
import { useNavigate } from "react-router-dom";

interface CreateProjectFromContractDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectFromContractDialog({
  contract,
  open,
  onOpenChange,
}: CreateProjectFromContractDialogProps) {
  const navigate = useNavigate();
  const { data: users } = useCompanyUsers();
  const createProject = useCreateProject();

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    manager_id: string;
    deadline: string;
    budget_hours: number;
    priority: 'baixa' | 'media' | 'alta' | 'urgente';
  }>({
    name: '',
    description: '',
    manager_id: '',
    deadline: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    budget_hours: 100,
    priority: 'media',
  });

  // Reset form when contract changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && contract) {
      setFormData({
        name: `Projeto - ${contract.counterparty?.name || 'Cliente'}`,
        description: contract.description || `Projeto de entrega do contrato ${contract.contract_number}`,
        manager_id: '',
        deadline: contract.data_fim || format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
        budget_hours: 100,
        priority: 'media',
      });
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!contract) return;
    
    await createProject.mutateAsync({
      name: formData.name,
      description: formData.description || undefined,
      contract_id: contract.id,
      counterparty_id: contract.counterparty_id,
      manager_id: formData.manager_id || undefined,
      start_date: new Date().toISOString(),
      deadline: formData.deadline,
      budget_hours: formData.budget_hours,
      budget_amount: contract.valor_total || contract.monthly_value || 0,
      status: 'planejamento',
      priority: formData.priority,
      progress_percentage: 0,
    });
    
    onOpenChange(false);
    navigate('/projetos/gestao');
  };

  if (!contract) return null;

  const contractValue = contract.valor_total || contract.monthly_value || 0;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Criar Projeto de Entrega
            </DialogTitle>
            <DialogDescription>
              Crie um projeto vinculado ao contrato para gerenciar tarefas, apontamentos e entregas.
            </DialogDescription>
          </DialogHeader>

          {/* Automation Alert */}
          <Alert className="border-primary/20 bg-primary/5">
            <Zap className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Automações ativadas:</strong> O projeto herdará o cliente e valor do contrato. 
              Marcos concluídos podem gerar faturas automaticamente.
            </AlertDescription>
          </Alert>

        <div className="space-y-4 py-4">
          {/* Contract Info Card */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{contract.contract_number}</Badge>
              <Badge className="bg-green-100 text-green-800">
                <DollarSign className="h-3 w-3 mr-1" />
                {contractValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Badge>
            </div>
            <p className="text-sm font-medium">{contract.counterparty?.name}</p>
            <p className="text-xs text-muted-foreground">{contract.description}</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do projeto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do projeto"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Gerente (PM)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Responsável pela entrega do projeto. Receberá alertas de prazos e tarefas.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select 
                  value={formData.manager_id} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, manager_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v: 'baixa' | 'media' | 'alta' | 'urgente') => 
                    setFormData(prev => ({ ...prev, priority: v }))
                  }
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Prazo de Entrega
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_hours" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Horas Orçadas
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Budget de horas vendidas ao cliente. Serve como base para calcular se o projeto está consumindo mais que o previsto.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="budget_hours"
                  type="number"
                  value={formData.budget_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_hours: Number(e.target.value) }))}
                  min={0}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name.trim() || createProject.isPending}
            className="gap-2"
          >
            <FolderKanban className="h-4 w-4" />
            Criar Projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </TooltipProvider>
  );
}
