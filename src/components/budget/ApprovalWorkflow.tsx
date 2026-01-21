import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send,
  User,
  AlertTriangle,
} from 'lucide-react';
import { usePendingApprovals, useApproveStep, useSubmitForApproval } from '@/hooks/useBudgetAdvanced';

interface ApprovalWorkflowProps {
  budgetId: string;
  budgetName: string;
  budgetStatus: string;
  onStatusChange?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  in_review: { label: 'Em Análise', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Aprovado', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejeitado', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  skipped: { label: 'Ignorado', variant: 'outline', icon: null },
};

export function ApprovalWorkflow({ budgetId, budgetName, budgetStatus, onStatusChange }: ApprovalWorkflowProps) {
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<{ stepId: string; requestId: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [comments, setComments] = useState('');

  const { data: pendingApprovals = [] } = usePendingApprovals();
  const submitForApproval = useSubmitForApproval();
  const approveStep = useApproveStep();

  const budgetApproval = pendingApprovals.find(a => a.budget_id === budgetId);
  const canSubmit = budgetStatus === 'rascunho';
  const canApprove = budgetApproval?.step_status === 'pending';

  const handleSubmit = async () => {
    await submitForApproval.mutateAsync({ budgetId, notes });
    setSubmitDialogOpen(false);
    setNotes('');
    onStatusChange?.();
  };

  const handleApproval = async (approved: boolean) => {
    if (!selectedStep) return;
    await approveStep.mutateAsync({
      stepId: selectedStep.stepId,
      requestId: selectedStep.requestId,
      comments,
      approved,
    });
    setApprovalDialogOpen(false);
    setSelectedStep(null);
    setComments('');
    onStatusChange?.();
  };

  const openApprovalDialog = (stepId: string, requestId: string) => {
    setSelectedStep({ stepId, requestId });
    setApprovalDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5" />
            Workflow de Aprovação
          </CardTitle>
          <CardDescription>
            Gerencie o processo de aprovação do orçamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Status Atual</p>
              <p className="font-medium">{budgetName}</p>
            </div>
            <Badge variant={
              budgetStatus === 'aprovado' ? 'default' :
              budgetStatus === 'pendente_aprovacao' ? 'secondary' :
              budgetStatus === 'rascunho' ? 'outline' : 'destructive'
            }>
              {budgetStatus === 'aprovado' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {budgetStatus === 'pendente_aprovacao' && <Clock className="h-3 w-3 mr-1" />}
              {budgetStatus.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
            </Badge>
          </div>

          {/* Approval Progress */}
          {budgetApproval && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso da Aprovação</span>
                <span className="font-medium">
                  Nível {budgetApproval.current_level} de {budgetApproval.total_levels}
                </span>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: budgetApproval.total_levels }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${
                      i + 1 < budgetApproval.current_level
                        ? 'bg-success'
                        : i + 1 === budgetApproval.current_level
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Current Step Details */}
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{budgetApproval.level_name || `Nível ${budgetApproval.current_level}`}</span>
                  {budgetApproval.step_status && (
                    <Badge variant={STATUS_CONFIG[budgetApproval.step_status]?.variant || 'outline'}>
                      {STATUS_CONFIG[budgetApproval.step_status]?.icon}
                      <span className="ml-1">{STATUS_CONFIG[budgetApproval.step_status]?.label}</span>
                    </Badge>
                  )}
                </div>
                
                {canApprove && budgetApproval.step_id && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => openApprovalDialog(budgetApproval.step_id, budgetApproval.request_id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aprovar / Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          {canSubmit && (
            <Button onClick={() => setSubmitDialogOpen(true)} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Submeter para Aprovação
            </Button>
          )}

          {/* Warning for rejected */}
          {budgetStatus === 'rascunho' && !canSubmit && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Orçamento em rascunho. Configure os valores antes de submeter.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submeter para Aprovação</DialogTitle>
            <DialogDescription>
              O orçamento será enviado para o workflow de aprovação configurado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione notas para os aprovadores..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitForApproval.isPending}>
              {submitForApproval.isPending ? 'Enviando...' : 'Submeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decisão de Aprovação</DialogTitle>
            <DialogDescription>
              Aprove ou rejeite este orçamento. Adicione comentários para justificar sua decisão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Comentários</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Justifique sua decisão..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleApproval(false)}
              disabled={approveStep.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
            <Button
              onClick={() => handleApproval(true)}
              disabled={approveStep.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
