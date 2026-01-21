import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  History, 
  GitCompare, 
  Eye,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useBudgetRevisions, type BudgetRevision } from '@/hooks/useBudgetModule';
import { useCompareVersions } from '@/hooks/useBudgetAdvanced';

interface VersionHistoryProps {
  budgetId: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
}

export function VersionHistory({ budgetId }: VersionHistoryProps) {
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<[string, string] | null>(null);
  const [detailVersion, setDetailVersion] = useState<BudgetRevision | null>(null);

  const { data: revisions = [], isLoading } = useBudgetRevisions(budgetId);
  const { data: comparison } = useCompareVersions(
    selectedVersions?.[0],
    selectedVersions?.[1]
  );

  const handleCompare = (versionA: string, versionB: string) => {
    setSelectedVersions([versionA, versionB]);
    setCompareDialogOpen(true);
  };

  const getSnapshotStats = (revision: BudgetRevision) => {
    const lines = ((revision.snapshot_data as Record<string, unknown>)?.lines as Array<{ planned_amount: number }>) || [];
    const total = lines.reduce((sum, line) => sum + (line.planned_amount || 0), 0);
    return { linesCount: lines.length, total };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </CardTitle>
          <CardDescription>
            Revisões e snapshots do orçamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revisions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma revisão registrada ainda.</p>
              <p className="text-sm">As revisões são criadas automaticamente ao fazer alterações significativas.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {revisions.map((revision, index) => {
                  const stats = getSnapshotStats(revision);
                  const prevRevision = revisions[index + 1];

                  return (
                    <div
                      key={revision.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {revision.revision_number}
                          </span>
                        </div>
                        {index < revisions.length - 1 && (
                          <div className="w-0.5 h-8 bg-muted mt-2" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {revision.revision_name || `Revisão ${revision.revision_number}`}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            v{revision.revision_number}
                          </Badge>
                        </div>
                        
                        {revision.reason && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {revision.reason}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span>
                            {format(new Date(revision.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          <span>{stats.linesCount} linhas</span>
                          <span>{formatCurrency(stats.total)}</span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailVersion(revision)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detalhes
                          </Button>
                          {prevRevision && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCompare(prevRevision.id, revision.id)}
                            >
                              <GitCompare className="h-4 w-4 mr-1" />
                              Comparar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailVersion} onOpenChange={() => setDetailVersion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailVersion?.revision_name || `Revisão ${detailVersion?.revision_number}`}
            </DialogTitle>
            <DialogDescription>
              {detailVersion?.reason || 'Sem descrição'}
            </DialogDescription>
          </DialogHeader>
          {detailVersion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(detailVersion.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Linhas:</span>
                  <span className="ml-2 font-medium">
                    {getSnapshotStats(detailVersion).linesCount}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Total do snapshot: <strong className="text-foreground">
                    {formatCurrency(getSnapshotStats(detailVersion).total)}
                  </strong>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparação de Versões
            </DialogTitle>
            <DialogDescription>
              Diferenças entre as versões selecionadas
            </DialogDescription>
          </DialogHeader>
          {comparison && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-success/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-success">{comparison.summary.addedCount}</p>
                  <p className="text-xs text-muted-foreground">Adicionadas</p>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-destructive">{comparison.summary.removedCount}</p>
                  <p className="text-xs text-muted-foreground">Removidas</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{comparison.summary.changedCount}</p>
                  <p className="text-xs text-muted-foreground">Alteradas</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{comparison.summary.unchangedCount}</p>
                  <p className="text-xs text-muted-foreground">Inalteradas</p>
                </div>
              </div>

              {/* Total Difference */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span>Diferença Total</span>
                  <span className={`text-xl font-bold ${comparison.summary.totalDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {comparison.summary.totalDiff >= 0 ? '+' : ''}{formatCurrency(comparison.summary.totalDiff)}
                  </span>
                </div>
              </div>

              {/* Changed Items */}
              {comparison.comparison.changed.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Alterações</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {comparison.comparison.changed.slice(0, 10).map((change, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border rounded text-sm">
                        <span className="flex-1 truncate">
                          Mês {String((change.before as Record<string, unknown>).month)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(Number((change.before as Record<string, unknown>).planned_amount) || 0)}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-medium">
                          {formatCurrency(Number((change.after as Record<string, unknown>).planned_amount) || 0)}
                        </span>
                        <Badge variant={change.diff >= 0 ? 'default' : 'destructive'}>
                          {change.diff >= 0 ? '+' : ''}{formatCurrency(change.diff)}
                        </Badge>
                      </div>
                    ))}
                    {comparison.comparison.changed.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center">
                        ... e mais {comparison.comparison.changed.length - 10} alterações
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
