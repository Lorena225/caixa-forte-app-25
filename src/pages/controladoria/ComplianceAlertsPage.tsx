import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  AlertCircle, 
  ChevronRight,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AlertaCompliance {
  id: string;
  tipo: 'critico' | 'atencao';
  titulo: string;
  sugestaoIA: string;
  acao: 'resolver' | 'link' | 'analisar' | 'processar';
  linkDestino?: string;
}

const alertas: AlertaCompliance[] = [
  {
    id: '1',
    tipo: 'critico',
    titulo: 'ECF vence em 5 dias',
    sugestaoIA: 'Recomendamos gerar o ECF imediatamente para evitar multas e penalidades',
    acao: 'resolver',
  },
  {
    id: '2',
    tipo: 'atencao',
    titulo: '3 lançamentos sem classificação tributária',
    sugestaoIA: 'Existem registros pendentes de classificação que podem impactar a apuração de impostos',
    acao: 'link',
    linkDestino: '/contabilidade/lancamentos',
  },
  {
    id: '3',
    tipo: 'critico',
    titulo: 'Saldo negativo em ICMS acumulado',
    sugestaoIA: 'Necessário revisar a apuração de ICMS do período. Pode haver créditos indevidos ou erros de lançamento',
    acao: 'analisar',
  },
  {
    id: '4',
    tipo: 'atencao',
    titulo: 'Reinado de ICMS necessário',
    sugestaoIA: 'O prazo para reinado de ICMS é até 15 de fevereiro. Processe o reinado para evitar inconsistências',
    acao: 'processar',
  },
];

export default function ComplianceAlertsPage() {
  const [resolvedAlerts, setResolvedAlerts] = useState<string[]>([]);

  const handleResolver = (id: string) => {
    setResolvedAlerts(prev => [...prev, id]);
    toast.success('Alerta marcado como resolvido');
  };

  const handleAnalisar = (titulo: string) => {
    toast.info(`Abrindo análise de: ${titulo}`);
  };

  const handleProcessar = (titulo: string) => {
    toast.success(`Processamento de ${titulo} iniciado`);
  };

  const handleLink = (destino: string) => {
    window.location.href = destino;
  };

  const activeAlertas = alertas.filter(a => !resolvedAlerts.includes(a.id));

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="Alertas de Compliance" />

        {/* Resumo */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">
              {activeAlertas.filter(a => a.tipo === 'critico').length} críticos
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">
              {activeAlertas.filter(a => a.tipo === 'atencao').length} atenção
            </span>
          </div>
          {resolvedAlerts.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {resolvedAlerts.length} resolvidos
              </span>
            </div>
          )}
        </div>

        {/* Stack de Alertas */}
        <div className="space-y-4">
          {activeAlertas.map((alerta) => (
            <Card 
              key={alerta.id}
              className={cn(
                'border-l-4 transition-all duration-200',
                alerta.tipo === 'critico' 
                  ? 'border-l-red-500 bg-red-50/50' 
                  : 'border-l-yellow-500 bg-yellow-50/50'
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                      alerta.tipo === 'critico' ? 'bg-red-100' : 'bg-yellow-100'
                    )}>
                      {alerta.tipo === 'critico' ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{alerta.titulo}</h3>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p><span className="font-medium text-primary">Sugestão IA:</span> {alerta.sugestaoIA}</p>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {alerta.acao === 'resolver' && (
                      <Button 
                        onClick={() => handleResolver(alerta.id)}
                        size="sm"
                        className="gap-1"
                      >
                        Resolver
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                    {alerta.acao === 'link' && (
                      <Button 
                        onClick={() => handleLink(alerta.linkDestino!)}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                      >
                        Ir para Lançamentos
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                    {alerta.acao === 'analisar' && (
                      <Button 
                        onClick={() => handleAnalisar(alerta.titulo)}
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                      >
                        Analisar
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                    {alerta.acao === 'processar' && (
                      <Button 
                        onClick={() => handleProcessar(alerta.titulo)}
                        size="sm"
                        className="gap-1"
                      >
                        Processar Reinado
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {activeAlertas.length === 0 && (
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tudo em dia!</h3>
                <p className="text-gray-600">Não há alertas de compliance pendentes.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
