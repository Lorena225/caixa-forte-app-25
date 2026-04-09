import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMetas, useMetasStats, calcularSemaforo, type Meta } from '@/hooks/useGestaoMetas';

const PERSPECTIVAS = [
  { key: 'financeiro', label: 'Financeiro', color: 'border-green-300 bg-green-50/50', icon: '💰' },
  { key: 'clientes', label: 'Clientes', color: 'border-blue-300 bg-blue-50/50', icon: '👥' },
  { key: 'processos', label: 'Processos Internos', color: 'border-orange-300 bg-orange-50/50', icon: '⚙️' },
  { key: 'aprendizado', label: 'Aprendizado & Crescimento', color: 'border-purple-300 bg-purple-50/50', icon: '📚' },
];

const SEMAFORO_DOT: Record<string, string> = {
  verde: 'bg-green-500',
  amarelo: 'bg-yellow-500',
  vermelho: 'bg-red-500',
  cinza: 'bg-gray-300',
};

function MetaMiniCard({ meta }: { meta: Meta }) {
  const semaforo = calcularSemaforo(meta);
  const pct = meta.meta_alvo > 0 ? Math.min(100, (meta.valor_atual / meta.meta_alvo) * 100) : 0;
  return (
    <div className="p-2.5 rounded-lg border bg-white shadow-sm">
      <div className="flex items-start gap-2">
        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', SEMAFORO_DOT[semaforo])} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-tight truncate">{meta.nome}</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={pct} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground shrink-0">{pct.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapaEstrategico() {
  const { data: metas = [], isLoading } = useMetas({ status: 'ativa' });
  const { data: stats } = useMetasStats();

  if (isLoading) return (
    <MainLayout>
      <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    </MainLayout>
  );

  const metasSemPerspectiva = metas.filter(m => !m.perspectiva || !PERSPECTIVAS.find(p => p.key === m.perspectiva));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mapa Estratégico</h1>
          <p className="text-muted-foreground">Objetivos organizados por perspectiva — metas ativas</p>
        </div>

        {/* Summary bar */}
        <div className="flex gap-4 p-4 bg-muted/40 rounded-xl">
          {[
            { label: 'Total de Metas', value: stats?.total || 0, color: 'text-foreground' },
            { label: 'Ativas', value: stats?.ativas || 0, color: 'text-green-600' },
            { label: 'Em Risco', value: stats?.risco || 0, color: 'text-red-600' },
            { label: 'Concluídas', value: stats?.concluidas || 0, color: 'text-purple-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 text-center">
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {metas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Target className="h-14 w-14 text-muted-foreground/20 mb-4" />
              <h3 className="font-semibold text-lg">Nenhuma meta ativa</h3>
              <p className="text-muted-foreground mt-1">Crie e ative metas em Gestão por Metas para visualizá-las aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PERSPECTIVAS.map(p => {
                const metasDaPerspectiva = metas.filter(m => m.perspectiva === p.key);
                return (
                  <Card key={p.key} className={cn('border-2', p.color)}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span>{p.icon}</span>
                        {p.label}
                        <Badge variant="outline" className="ml-auto text-xs">{metasDaPerspectiva.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metasDaPerspectiva.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma meta nesta perspectiva</p>
                      ) : (
                        <div className="space-y-2">
                          {metasDaPerspectiva.map(m => <MetaMiniCard key={m.id} meta={m} />)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Sem perspectiva */}
            {metasSemPerspectiva.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-muted-foreground">Sem perspectiva definida</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {metasSemPerspectiva.map(m => <MetaMiniCard key={m.id} meta={m} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-medium">Semáforo:</span>
              {[['verde', 'No alvo'], ['amarelo', 'Atenção'], ['vermelho', 'Em risco'], ['cinza', 'Sem meta']].map(([cor, label]) => (
                <div key={cor} className="flex items-center gap-1">
                  <div className={cn('w-2.5 h-2.5 rounded-full', SEMAFORO_DOT[cor])} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
