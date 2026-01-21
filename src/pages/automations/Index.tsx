import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AutomationCard } from '@/components/automations/AutomationCard';
import { 
  Plus, 
  Search, 
  Zap,
  Filter
} from 'lucide-react';
import { useAutomationsManagement } from '@/hooks/useAutomationsManagement';
import { toast } from 'sonner';

export default function AutomationsIndex() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { 
    automations, 
    isLoading, 
    toggleAutomation, 
    deleteAutomation,
    testAutomation,
  } = useAutomationsManagement({
    filters: {
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      search: searchTerm || undefined,
    },
  });

  const handleToggle = async (id: string, isActive: boolean) => {
    setTogglingId(id);
    try {
      await toggleAutomation.mutateAsync({ automationId: id, isActive });
      toast.success(isActive ? 'Automação ativada' : 'Automação desativada');
    } catch (error) {
      toast.error('Erro ao alterar status da automação');
    } finally {
      setTogglingId(null);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testAutomation.mutateAsync(id);
      if (result.success) {
        toast.success('Teste executado com sucesso!');
      } else {
        toast.error(`Teste falhou: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      toast.error('Erro ao testar automação');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAutomation.mutateAsync(id);
      toast.success('Automação excluída');
    } catch (error) {
      toast.error('Erro ao excluir automação');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Automações"
          description="Configure workflows automáticos para otimizar seus processos"
          actions={
            <Button onClick={() => navigate('/automacoes/nova')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Automação
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar automação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select 
            value={statusFilter} 
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : automations.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma automação encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Crie sua primeira automação para otimizar seus processos'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => navigate('/automacoes/nova')}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Automação
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {automations.map((automation) => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onEdit={(id) => navigate(`/automacoes/${id}`)}
                onViewHistory={(id) => navigate(`/automacoes/${id}?tab=history`)}
                onToggle={handleToggle}
                onTest={handleTest}
                onDelete={handleDelete}
                isToggling={togglingId === automation.id}
                isTesting={testingId === automation.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
