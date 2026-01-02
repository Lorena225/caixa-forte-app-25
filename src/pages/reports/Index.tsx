import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  Calculator, 
  TrendingUp,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  BarChart3,
  PieChart,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';

const reportCategories = [
  {
    title: 'Contábeis',
    description: 'Relatórios contábeis formais',
    reports: [
      { title: 'Diário Geral', href: '/contabilidade/diario', icon: BookOpen },
      { title: 'Razão', href: '/contabilidade/razao', icon: FileText },
      { title: 'Balancete', href: '/contabilidade/balancete', icon: Calculator },
      { title: 'DRE Contábil', href: '/contabilidade/dre', icon: TrendingUp },
      { title: 'Balanço Patrimonial', href: '/contabilidade/balanco', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Financeiros Operacionais',
    description: 'Relatórios financeiros do dia a dia',
    reports: [
      { title: 'Contas a Receber', href: '/reports/ar-detail', icon: ArrowDownCircle },
      { title: 'Contas a Pagar', href: '/reports/ap-detail', icon: ArrowUpCircle },
      { title: 'Fluxo de Caixa Realizado', href: '/fluxo-caixa', icon: Wallet },
      { title: 'Fluxo de Caixa Projetado', href: '/dashboards/cash', icon: Wallet },
      { title: 'Extrato por Carteira', href: '/reports/wallet-statement', icon: FileText },
    ],
  },
  {
    title: 'Gerenciais',
    description: 'Análises gerenciais e indicadores',
    reports: [
      { title: 'Orçamento x Realizado', href: '/dashboards/budget', icon: Target },
      { title: 'Rentabilidade por Dimensão', href: '/reports/profitability', icon: PieChart },
      { title: 'Inadimplência', href: '/dashboards/ar', icon: TrendingUp },
      { title: 'Indicadores Financeiros', href: '/reports/kpis', icon: BarChart3 },
    ],
  },
];

export default function ReportsIndex() {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Relatórios"
          description="Central de relatórios contábeis, financeiros e gerenciais"
        />

        <div className="space-y-8">
          {reportCategories.map((category) => (
            <div key={category.title}>
              <h2 className="text-lg font-semibold mb-2">{category.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {category.reports.map((report) => (
                  <Card key={report.href} className="card-hover">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted text-primary">
                          <report.icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">{report.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to={report.href}>
                          Acessar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
