import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AutomationBuilder, AutomationHistory } from '@/components/automations';
import { 
  Play, 
  Pause, 
  Loader2,
  Calendar,
  User,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAutomationsManagement } from '@/hooks/useAutomationsManagement';
import { toast } from 'sonner';
import { AutomationTrigger, AutomationAction, UpdateAutomationData } from '@/types/automations';

export default function AutomationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'config';
  const [activeTab, setActiveTab] = useState(initialTab);

  const isNewAutomation = id === 'nova';

  const { 
    automation,
    automationLogs,
    isLoadingAutomation,
    isLoadingLogs,
    createAutomation,
    updateAutomation,
    toggleAutomation,
    testAutomation,
  } = useAutomationsManagement({
    automationId: isNewAutomation ? undefined : id,
  });

  const handleSave = async (data: UpdateAutomationData) => {
    try {
      if (isNewAutomation) {
        const created = await createAutomation.mutateAsync({
          name: data.name!,
          description: data.description,
          is_active: data.is_active ?? true,
          triggers: data.triggers!,
          actions: data.actions!,
        });
        toast.success('Automação criada com sucesso!');
        navigate(`/automacoes/${created.id}`);
      } else if (id) {
        await updateAutomation.mutateAsync({ automationId: id, data });
        toast.success('Automação atualizada!');
      }
    } catch (error) {
      toast.error('Erro ao salvar automação');
    }
  };

  const handleToggle = async () => {
    if (!id || isNewAutomation) return;
    try {
      await toggleAutomation.mutateAsync({ 
        automationId: id, 
        isActive: !automation?.is_active 
      });
      toast.success(automation?.is_active ? 'Automação desativada' : 'Automação ativada');
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleTest = async (): Promise<{ success: boolean; message: string }> => {
    if (!id || isNewAutomation) {
      return { success: false, message: 'Salve a automação antes de testar' };
    }
    try {
      const result = await testAutomation.mutateAsync(id);
      return {
        success: result.success,
        message: result.success 
          ? `Teste executado com sucesso em ${result.duration_ms}ms` 
          : result.error || 'Erro no teste',
      };
    } catch (error) {
      return { success: false, message: 'Erro ao executar teste' };
    }
  };

  if (isLoadingAutomation && !isNewAutomation) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <BackButton to="/automacoes" label="Automações" />
            <h1 className="text-2xl font-bold">
              {isNewAutomation ? 'Nova Automação' : automation?.name || 'Automação'}
            </h1>
            {!isNewAutomation && automation && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Criada em {format(new Date(automation.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {automation.execution_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" />
                    {automation.execution_count} execuções
                  </span>
                )}
              </div>
            )}
          </div>

          {!isNewAutomation && automation && (
            <div className="flex items-center gap-2">
              <Badge 
                variant={automation.is_active ? 'default' : 'secondary'}
                className={automation.is_active ? 'bg-green-500' : ''}
              >
                {automation.is_active ? '🟢 Ativa' : '🔴 Inativa'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleToggle}
                disabled={toggleAutomation.isPending}
              >
                {toggleAutomation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : automation.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Ativar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        {isNewAutomation ? (
          <AutomationBuilder
            onSave={handleSave}
            isSaving={createAutomation.isPending}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="config">Configuração</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-6">
              {automation && (
                <AutomationBuilder
                  initialData={{
                    name: automation.name,
                    description: automation.description,
                    is_active: automation.is_active,
                    triggers: automation.triggers as AutomationTrigger[],
                    actions: automation.actions as AutomationAction[],
                  }}
                  onSave={handleSave}
                  onTest={handleTest}
                  isSaving={updateAutomation.isPending}
                  isTesting={testAutomation.isPending}
                />
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <AutomationHistory
                logs={automationLogs}
                isLoading={isLoadingLogs}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
