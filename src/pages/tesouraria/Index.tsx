import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  Building2, 
  FileText, 
  ArrowRight,
  RefreshCw,
  Send,
  Download,
  TrendingUp,
  Landmark,
  CreditCard,
  Barcode,
  ArrowRightLeft,
  FileCheck,
  Banknote,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/formatters';

const modules = [
  {
    title: 'Posição de Caixa',
    description: 'Saldos atuais e projeções por conta',
    icon: TrendingUp,
    href: '/tesouraria/posicao',
    color: 'text-success'
  },
  {
    title: 'Contas Bancárias',
    description: 'Cadastro e gestão de contas',
    icon: Building2,
    href: '/cadastros/contas-bancarias',
    color: 'text-primary'
  },
  {
    title: 'Conciliação Bancária',
    description: 'Importar extratos e conciliar movimentos',
    icon: RefreshCw,
    href: '/tesouraria/conciliacao',
    color: 'text-primary'
  },
  {
    title: 'Transferências Bancárias',
    description: 'Transferências entre contas',
    icon: ArrowRightLeft,
    href: '/tesouraria/transferencias',
    color: 'text-info'
  },
  {
    title: 'CNAB - Remessas',
    description: 'Gerar arquivos de cobrança e pagamento',
    icon: Send,
    href: '/tesouraria/cnab-remessa',
    color: 'text-info'
  },
  {
    title: 'CNAB - Retornos',
    description: 'Importar e processar arquivos de retorno',
    icon: Download,
    href: '/tesouraria/cnab-retorno',
    color: 'text-warning'
  },
  {
    title: 'Cheques',
    description: 'Gestão de cheques emitidos e recebidos',
    icon: FileCheck,
    href: '/tesouraria/cheques',
    color: 'text-primary'
  },
  {
    title: 'Caixa Física',
    description: 'Controle de caixas e movimentações',
    icon: Banknote,
    href: '/tesouraria/caixa-fisica',
    color: 'text-success'
  },
  {
    title: 'Empréstimos e Financiamentos',
    description: 'Contratos, parcelas e geração de títulos',
    icon: Landmark,
    href: '/tesouraria/contratos',
    color: 'text-primary'
  },
  {
    title: 'Boletos',
    description: 'Emissão e gestão de boletos bancários',
    icon: Barcode,
    href: '/tesouraria/boletos',
    color: 'text-muted-foreground'
  },
  {
    title: 'Cartões Corporativos',
    description: 'Gestão de cartões e despesas',
    icon: CreditCard,
    href: '/tesouraria/cartoes',
    color: 'text-primary'
  },
  {
    title: 'Lotes de Pagamento',
    description: 'Borderô e aprovação de pagamentos',
    icon: FileText,
    href: '/tesouraria/bordero',
    color: 'text-primary'
  },
];

export default function TesourariaIndex() {
  const { currentCompany } = useAuth();

  const { data: cashPosition } = useQuery({
    queryKey: ['cash-position-summary', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('v_cash_position_daily')
        .select('*')
        .eq('company_id', currentCompany.id);
      
      if (error) throw error;
      
      const totals = (data || []).reduce(
        (acc, row) => ({
          balance: acc.balance + Number(row.current_balance || 0),
          inflows: acc.inflows + Number(row.total_inflows || 0),
          outflows: acc.outflows + Number(row.total_outflows || 0)
        }),
        { balance: 0, inflows: 0, outflows: 0 }
      );
      
      return totals;
    },
    enabled: !!currentCompany?.id
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tesouraria"
          description="Gestão de caixa, bancos e conciliação"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="kpi-card kpi-card-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${(cashPosition?.balance || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(cashPosition?.balance || 0)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="kpi-card kpi-card-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Entradas (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(cashPosition?.inflows || 0)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="kpi-card kpi-card-danger">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saídas (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(cashPosition?.outflows || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

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
