import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Receipt, 
  Calculator, 
  ArrowRight,
  Building2,
  Percent,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

const modules = [
  {
    title: 'Documentos Fiscais',
    description: 'NFe, NFSe, CTe - registros e consultas',
    icon: FileText,
    href: '/fiscal/documentos',
    color: 'text-primary'
  },
  {
    title: 'Retenções',
    description: 'ISS, IRRF, INSS, PIS/COFINS/CSLL retidos',
    icon: Percent,
    href: '/fiscal/retencoes',
    color: 'text-warning'
  },
  {
    title: 'Apuração de Impostos',
    description: 'Cálculo e apuração por período',
    icon: Calculator,
    href: '/fiscal/apuracao',
    color: 'text-info'
  },
  {
    title: 'Regras de Impostos',
    description: 'Configuração de alíquotas e regras',
    icon: Receipt,
    href: '/fiscal/regras',
    color: 'text-success'
  },
  {
    title: 'Obrigações Acessórias',
    description: 'SPED, DCTF, DIRF e outras declarações',
    icon: FileSpreadsheet,
    href: '/fiscal/obrigacoes',
    color: 'text-primary'
  },
  {
    title: 'Dados da Empresa',
    description: 'Regime tributário, inscrições e certificados',
    icon: Building2,
    href: '/fiscal/empresa',
    color: 'text-muted-foreground'
  }
];

const alerts = [
  { message: 'ISS do mês anterior pendente de recolhimento', type: 'warning' },
  { message: '3 retenções de IRRF aguardando apuração', type: 'info' }
];

export default function FiscalIndex() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Fiscal / Tributos"
          description="Gestão fiscal e tributária Brasil"
        />

        {alerts.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {alerts.map((alert, index) => (
                    <p key={index} className="text-sm">
                      {alert.message}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.href} className="card-hover">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${module.color}`}>
                    <module.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {module.description}
                </CardDescription>
                <Button asChild variant="outline" className="w-full">
                  <Link to={module.href}>
                    Acessar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
