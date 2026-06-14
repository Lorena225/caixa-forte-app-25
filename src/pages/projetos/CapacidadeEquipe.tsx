import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Users, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';
import { useCapacityMap, useCaptureSnapshots } from '@/hooks/useProjectModule';
import { cn } from '@/lib/utils';

export default function CapacidadeEquipe() {
  const { data: capacity = [], isLoading } = useCapacityMap();
  const capture = useCaptureSnapshots();

  const overbooked = capacity.filter((c) => Number(c.total_pct) > 100);
  const idle = capacity.filter((c) => Number(c.total_pct) < 50);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Capacidade da Equipe"
          description="Mapa de alocação por colaborador — quem está super ou subalocado nos projetos ativos">
          <Button onClick={() => capture.mutate()} disabled={capture.isPending} variant="outline">
            {capture.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
            Capturar snapshot semanal
          </Button>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />Pessoas alocadas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{capacity.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Superalocados</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{overbooked.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Com folga</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-amber-600">{idle.length}</p></CardContent></Card>
        </div>

        {overbooked.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {overbooked.length} colaborador(es) com dedicação acima de 100%: {overbooked.map((c) => c.full_name).join(', ')}.
              Revise as alocações para evitar sobrecarga.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle>Alocação por colaborador</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : capacity.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma alocação ativa.</p>
                  <p className="text-sm">Aloque pessoas em Alocação & Custo-hora para montar o mapa de capacidade.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {capacity.map((c) => {
                    const pct = Number(c.total_pct);
                    const over = pct > 100;
                    return (
                      <div key={c.employee_id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{c.full_name}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{c.project_count} projeto(s)</span>
                            <Badge variant={over ? 'destructive' : pct < 50 ? 'secondary' : 'default'}>{pct}%</Badge>
                          </span>
                        </div>
                        <Progress value={Math.min(pct, 100)} className={cn('h-2', over && '[&>div]:bg-red-500')} />
                      </div>
                    );
                  })}
                </div>
              )}
          </CardContent>
        </Card>

        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            O snapshot semanal congela horas, custo, receita e margem de cada projeto na data — alimentando o histórico de
            burn rate e a evolução de margem na tela de Rentabilidade. Capture toda sexta-feira ou configure um agendamento.
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
