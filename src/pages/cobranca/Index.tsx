import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, Bell, AlertOctagon, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CobrancaIndex() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cobrança"
          description="Gestão de boletos, réguas de cobrança e negativação"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                A Vencer (7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(45000)}
              </div>
              <p className="text-xs text-muted-foreground">18 títulos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Em Atraso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(28500)}
              </div>
              <p className="text-xs text-muted-foreground">12 títulos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Recebido (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(156000)}
              </div>
              <p className="text-xs text-muted-foreground">85 títulos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Taxa de Inadimplência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.2%</div>
              <p className="text-xs text-green-600">-0.5% vs mês anterior</p>
            </CardContent>
          </Card>
        </div>

        {/* Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/cobranca/boletos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Boletos
                </CardTitle>
                <CardDescription>
                  Emissão, registro e acompanhamento de boletos bancários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Acessar Boletos
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/cobranca/reguas">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Réguas de Cobrança
                </CardTitle>
                <CardDescription>
                  Configure automações de lembretes e notificações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Acessar Réguas
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/cobranca/negativacao">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertOctagon className="h-5 w-5 text-primary" />
                  Negativação
                </CardTitle>
                <CardDescription>
                  Gerencie negativações em bureaus de crédito (SPC/Serasa)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Acessar Negativação
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
