import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  Calculator, 
  Lock, 
  ArrowRight,
  Scale,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';

const modules = [
  {
    title: 'Lançamentos Contábeis',
    description: 'Lançamentos manuais com partidas dobradas (débito/crédito)',
    icon: BookOpen,
    href: '/contabilidade/lancamentos',
    color: 'text-primary'
  },
  {
    title: 'Livro Diário',
    description: 'Visualize todos os lançamentos contábeis em ordem cronológica',
    icon: FileText,
    href: '/contabilidade/diario',
    color: 'text-info'
  },
  {
    title: 'Livro Razão',
    description: 'Movimentação detalhada por conta contábil',
    icon: FileSpreadsheet,
    href: '/contabilidade/razao',
    color: 'text-warning'
  },
  {
    title: 'Balancete',
    description: 'Balancete de verificação com saldos por conta',
    icon: Calculator,
    href: '/contabilidade/balancete',
    color: 'text-success'
  },
  {
    title: 'Balanço Patrimonial',
    description: 'Demonstrativo de ativos, passivos e patrimônio líquido',
    icon: Scale,
    href: '/contabilidade/balanco',
    color: 'text-primary'
  },
  {
    title: 'DRE Contábil',
    description: 'Demonstração do Resultado do Exercício',
    icon: TrendingUp,
    href: '/contabilidade/dre',
    color: 'text-success'
  },
  {
    title: 'Fechamento de Período',
    description: 'Fechar e travar períodos contábeis',
    icon: Lock,
    href: '/contabilidade/fechamento',
    color: 'text-destructive'
  }
];

export default function ContabilidadeIndex() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Contabilidade"
          description="Gestão contábil com partidas dobradas, livros e demonstrativos"
        />

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
