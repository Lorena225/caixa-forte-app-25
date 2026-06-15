import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderKanban, Wallet, Receipt, ShieldAlert, Scale, Bot, Check, X, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AIAction } from '@/hooks/useAIInbox';

const agentMeta: Record<string, { icon: any; label: string }> = {
  PROJETOS: { icon: FolderKanban, label: 'Agente de Projetos' },
  AR: { icon: Receipt, label: 'Agente de Cobrança' },
  AP: { icon: Wallet, label: 'Agente de Pagamentos' },
  CAIXA: { icon: Wallet, label: 'Agente de Caixa' },
  CONCILIACAO: { icon: Scale, label: 'Agente de Conciliação' },
  AUDITOR: { icon: ShieldAlert, label: 'Agente Auditor' },
  ORCAMENTO: { icon: Scale, label: 'Agente de Orçamento' },
};

const levelMeta: Record<string, { label: string; variant: any; desc: string }> = {
  N3_autonomous: { label: 'N3 Autônomo', variant: 'outline', desc: 'Executado automaticamente' },
  N2_notify: { label: 'N2 Notifica', variant: 'secondary', desc: 'Executa e avisa' },
  N1_approval: { label: 'N1 Aprovação', variant: 'default', desc: 'Requer sua aprovação' },
  N0_suggestion: { label: 'N0 Sugestão', variant: 'outline', desc: 'Apenas sugere' },
};

function confidenceColor(pct: number | null) {
  if (pct == null) return '';
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

interface Props {
  action: AIAction;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRevert?: (id: string) => void;
  busy?: boolean;
}

export function AIActionCard({ action, onApprove, onReject, onRevert, busy }: Props) {
  const meta = agentMeta[action.agent_type] ?? { icon: Bot, label: action.agent_type };
  const Icon = meta.icon;
  const level = levelMeta[action.autonomy_level] ?? { label: action.autonomy_level, variant: 'outline', desc: '' };
  const urgent = action.autonomy_level === 'N1_approval';

  return (
    <div className={cn('border rounded-lg p-4 space-y-3', urgent && 'border-l-4 border-l-amber-500')}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-md bg-primary/10 p-2 shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
          <div className="min-w-0">
            <p className="font-medium">{action.action_label}</p>
            <p className="text-xs text-muted-foreground">{meta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={level.variant} title={level.desc}>{level.label}</Badge>
          {action.confidence_pct != null && (
            <Badge variant="outline" className={confidenceColor(action.confidence_pct)}>
              {action.confidence_pct}% confiança
            </Badge>
          )}
        </div>
      </div>

      {action.reason && (
        <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Por quê: </span>{action.reason}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {action.entity_type && <span>Origem: {action.entity_type}</span>}
        {action.amount != null && <span className="font-medium text-foreground">Impacto: {formatCurrency(Number(action.amount))}</span>}
        <span>{action.created_at ? formatDistanceToNow(new Date(action.created_at), { addSuffix: true, locale: ptBR }) : ''}</span>
      </div>

      {(onApprove || onReject || onRevert) && (
        <div className="flex items-center gap-2 pt-1">
          {action.status === 'pending_approval' && onApprove && (
            <Button size="sm" onClick={() => onApprove(action.id)} disabled={busy}>
              <Check className="h-4 w-4 mr-1" />Aprovar</Button>
          )}
          {action.status === 'pending_approval' && onReject && (
            <Button size="sm" variant="outline" onClick={() => onReject(action.id)} disabled={busy}>
              <X className="h-4 w-4 mr-1" />Rejeitar</Button>
          )}
          {action.status === 'executed' && onRevert && (
            <Button size="sm" variant="ghost" onClick={() => onRevert(action.id)} disabled={busy}>
              <Undo2 className="h-4 w-4 mr-1" />Reverter</Button>
          )}
          {action.status !== 'pending' && (
            <Badge variant={action.status === 'executed' ? 'default' : action.status === 'rejected' ? 'destructive' : 'secondary'}>
              {action.status === 'executed' ? 'Executada' : action.status === 'rejected' ? 'Rejeitada' : action.status === 'reverted' ? 'Revertida' : action.status}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
