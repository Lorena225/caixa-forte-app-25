import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  FileText, Receipt, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Calendar, RefreshCw, Eye,
  ArrowRight, Shield, XCircle, Lightbulb
} from 'lucide-react';
import { useFiscalDocuments, useFiscalDocumentStats, FiscalDocumentWithCounterparty } from '@/hooks/useFiscalDocuments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Inconsistency {
  id: string;
  type: 'venda_sem_nf' | 'nf_sem_pagamento' | 'divergencia_valores';
  severity: 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  entityId?: string;
  suggestedAction: string;
  createdAt: Date;
}

// Mock inconsistencies
const mockInconsistencies: Inconsistency[] = [
  {
    id: '1',
    type: 'venda_sem_nf',
    severity: 'critical',
    title: 'Venda realizada sem emissão de Nota Fiscal',
    description: 'Transação #1234 de R$ 5.500,00 para Cliente ABC não possui nota fiscal vinculada.',
    entityId: 'trans-1234',
    suggestedAction: 'Emitir NF-e para regularizar',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    type: 'nf_sem_pagamento',
    severity: 'warning',
    title: 'NF-e emitida sem baixa financeira',
    description: 'NF-e 000.123.456 de R$ 3.200,00 foi autorizada mas não há recebimento registrado.',
    entityId: 'nfe-123456',
    suggestedAction: 'Vincular pagamento ou registrar a receber',
    createdAt: new Date('2024-01-14'),
  },
  {
    id: '3',
    type: 'divergencia_valores',
    severity: 'warning',
    title: 'Divergência entre NF e pagamento',
    description: 'NF-e 000.123.789 foi emitida por R$ 1.000,00 mas o pagamento registrado é de R$ 950,00.',
    entityId: 'nfe-123789',
    suggestedAction: 'Verificar desconto ou emitir nota complementar',
    createdAt: new Date('2024-01-13'),
  },
];

const severityConfig = {
  critical: { 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', 
    icon: XCircle,
    label: 'Crítico'
  },
  warning: { 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', 
    icon: AlertTriangle,
    label: 'Atenção'
  },
  info: { 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', 
    icon: Lightbulb,
    label: 'Info'
  },
};

export default function DashboardFiscal() {
  const { data: documents = [] } = useFiscalDocuments();
  const { data: stats } = useFiscalDocumentStats();
  const [inconsistencies] = useState(mockInconsistencies);

  // Calculate monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyDocs = documents.filter(d => {
    const docDate = new Date(d.issue_date);
    return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
  });

  const monthlyStats = {
    emitidas: monthlyDocs.filter(d => d.status === 'autorizada').length,
    pendentes: monthlyDocs.filter(d => d.status === 'pendente' || d.status === 'rascunho').length,
    rejeitadas: monthlyDocs.filter(d => d.status === 'rejeitada').length,
    canceladas: monthlyDocs.filter(d => d.status === 'cancelada').length,
    valorTotal: monthlyDocs.reduce((sum, d) => sum + Number(d.total_nf || 0), 0),
  };

  // Estimated taxes (mock calculation)
  const estimatedTaxes = {
    icms: monthlyStats.valorTotal * 0.12,
    pis: monthlyStats.valorTotal * 0.0165,
    cofins: monthlyStats.valorTotal * 0.076,
    iss: documents.filter(d => d.document_model === 'nfse').reduce((sum, d) => sum + Number(d.total_iss || 0), 0),
  };

  const complianceScore = Math.max(0, 100 - (inconsistencies.filter(i => i.severity === 'critical').length * 20) - (inconsistencies.filter(i => i.severity === 'warning').length * 5));

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Painel Fiscal & Compliance"
          description="Visão consolidada de documentos fiscais, impostos e alertas de conformidade"
        />

        {/* Critical Alerts */}
        {inconsistencies.filter(i => i.severity === 'critical').length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção: Inconsistências Críticas Detectadas</AlertTitle>
            <AlertDescription>
              Existem {inconsistencies.filter(i => i.severity === 'critical').length} problemas que requerem ação imediata para manter a conformidade fiscal.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Notas Emitidas
              </CardTitle>
              <CardDescription className="text-xs">Este mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{monthlyStats.emitidas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Pendentes
              </CardTitle>
              <CardDescription className="text-xs">Aguardando</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{monthlyStats.pendentes}</div>
            </CardContent>
          </Card>

          <Card className={monthlyStats.rejeitadas > 0 ? 'border-orange-200' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Rejeitadas
              </CardTitle>
              <CardDescription className="text-xs">Requerem ação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{monthlyStats.rejeitadas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Faturamento
              </CardTitle>
              <CardDescription className="text-xs">Este mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(monthlyStats.valorTotal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Compliance
              </CardTitle>
              <CardDescription className="text-xs">Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`text-3xl font-bold ${complianceScore >= 80 ? 'text-green-600' : complianceScore >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                  {complianceScore}%
                </div>
              </div>
              <Progress value={complianceScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Impostos Estimados */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Impostos Estimados
              </CardTitle>
              <CardDescription>
                Projeção mensal baseada nas notas emitidas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <span className="font-medium">ICMS</span>
                  <span className="text-xs text-muted-foreground ml-2">(12%)</span>
                </div>
                <span className="font-mono font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedTaxes.icms)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <span className="font-medium">PIS</span>
                  <span className="text-xs text-muted-foreground ml-2">(1,65%)</span>
                </div>
                <span className="font-mono font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedTaxes.pis)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <span className="font-medium">COFINS</span>
                  <span className="text-xs text-muted-foreground ml-2">(7,6%)</span>
                </div>
                <span className="font-mono font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedTaxes.cofins)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <span className="font-medium">ISS Retido</span>
                  <span className="text-xs text-muted-foreground ml-2">(NFS-e)</span>
                </div>
                <span className="font-mono font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedTaxes.iss)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-3 mt-4">
                <span className="font-semibold">Total Estimado</span>
                <span className="font-mono font-bold text-lg">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    estimatedTaxes.icms + estimatedTaxes.pis + estimatedTaxes.cofins + estimatedTaxes.iss
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Alertas de Inconsistência */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Alertas de Inconsistência
                  </CardTitle>
                  <CardDescription>
                    Problemas detectados que requerem atenção
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Novamente
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {inconsistencies.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium text-green-700">Tudo em ordem!</p>
                  <p className="text-sm text-muted-foreground">Nenhuma inconsistência detectada</p>
                </div>
              ) : (
                inconsistencies.map((item) => {
                  const config = severityConfig[item.severity];
                  const Icon = config.icon;
                  
                  return (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.severity === 'critical' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/10' : 
                        item.severity === 'warning' ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/10' : 
                        'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${
                          item.severity === 'critical' ? 'text-red-500' : 
                          item.severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{item.title}</span>
                            <Badge className={config.color}>{config.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <Lightbulb className="h-4 w-4 text-primary" />
                            <span className="text-primary font-medium">{item.suggestedAction}</span>
                            <ArrowRight className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Últimas Notas Fiscais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {doc.document_model === '55' ? 'NF-e' : doc.document_model === 'nfse' ? 'NFS-e' : doc.document_model}
                    </Badge>
                    <div>
                      <span className="font-medium">
                        {doc.document_series}-{doc.document_number?.toString().padStart(9, '0')}
                      </span>
                      <span className="text-muted-foreground mx-2">•</span>
                      <span className="text-sm text-muted-foreground">
                        {doc.recipient_name || 'Sem destinatário'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(doc.total_nf) || 0)}
                    </span>
                    <Badge className={
                      doc.status === 'autorizada' ? 'bg-green-100 text-green-800' :
                      doc.status === 'pendente' ? 'bg-blue-100 text-blue-800' :
                      doc.status === 'rejeitada' ? 'bg-red-100 text-red-800' :
                      'bg-muted'
                    }>
                      {doc.status === 'autorizada' ? 'Autorizada' : 
                       doc.status === 'pendente' ? 'Pendente' :
                       doc.status === 'rejeitada' ? 'Rejeitada' : doc.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {doc.issue_date && format(new Date(doc.issue_date), 'dd/MM', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
