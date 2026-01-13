import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const obligations = [
  { 
    code: 'SPED Fiscal', 
    name: 'EFD ICMS/IPI', 
    deadline: '25/02/2026',
    status: 'pendente',
    description: 'Escrituração Fiscal Digital' 
  },
  { 
    code: 'SPED Contribuições', 
    name: 'EFD Contribuições', 
    deadline: '15/02/2026',
    status: 'pendente',
    description: 'PIS/Pasep e Cofins' 
  },
  { 
    code: 'DCTF', 
    name: 'Declaração de Débitos e Créditos', 
    deadline: '15/02/2026',
    status: 'atrasado',
    description: 'Tributos Federais' 
  },
  { 
    code: 'GIA', 
    name: 'Guia de Informação e Apuração', 
    deadline: '16/02/2026',
    status: 'enviado',
    description: 'ICMS Estadual' 
  },
  { 
    code: 'REINF', 
    name: 'Escrituração de Retenções', 
    deadline: '15/02/2026',
    status: 'pendente',
    description: 'Informações Fiscais' 
  },
];

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  pendente: { color: 'bg-warning/10 text-warning', icon: <Clock className="h-4 w-4" /> },
  atrasado: { color: 'bg-destructive/10 text-destructive', icon: <AlertCircle className="h-4 w-4" /> },
  enviado: { color: 'bg-success/10 text-success', icon: <CheckCircle className="h-4 w-4" /> },
};

export default function FiscalObrigacoes() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Obrigações Acessórias"
          description="Calendário e gestão de declarações fiscais"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-destructive/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-sm">Atrasadas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">1</p>
            </CardContent>
          </Card>

          <Card className="border-warning/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <CardTitle className="text-sm">Pendentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">3</p>
            </CardContent>
          </Card>

          <Card className="border-success/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <CardTitle className="text-sm">Enviadas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">1</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendário Fiscal
                </CardTitle>
                <CardDescription>
                  Próximas obrigações e prazos
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link to="/fiscal/sped">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Gerar SPED
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {obligations.map((ob) => (
                <div
                  key={ob.code}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ob.code}</span>
                        <span className="text-sm text-muted-foreground">
                          - {ob.name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ob.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">Vencimento</p>
                      <p className="text-sm text-muted-foreground">{ob.deadline}</p>
                    </div>
                    <Badge className={statusConfig[ob.status].color}>
                      <span className="flex items-center gap-1">
                        {statusConfig[ob.status].icon}
                        {ob.status}
                      </span>
                    </Badge>
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
