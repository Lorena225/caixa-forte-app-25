import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { TreasuryKPIs } from '@/components/tesouraria/TreasuryKPIs';
import { CashFlowMiniChart } from '@/components/tesouraria/CashFlowMiniChart';
import { TreasuryQuickActions } from '@/components/tesouraria/TreasuryQuickActions';
import { TreasuryMenuSection } from '@/components/tesouraria/TreasuryMenuSection';
import { 
  Building2, 
  Banknote,
  CreditCard,
  Barcode,
  FileText,
  FolderSync,
  Landmark,
  FileCheck,
} from 'lucide-react';

const menuSections = [
  {
    title: 'Minhas Contas',
    items: [
      {
        title: 'Contas Bancárias',
        description: 'Cadastro e gestão de contas',
        icon: Building2,
        href: '/cadastros/contas-bancarias',
        color: 'text-primary'
      },
      {
        title: 'Caixa Físico',
        description: 'Controle de caixas e movimentações',
        icon: Banknote,
        href: '/tesouraria/caixa-fisica',
        color: 'text-success'
      },
      {
        title: 'Cartões Corporativos',
        description: 'Gestão de cartões e despesas',
        icon: CreditCard,
        href: '/tesouraria/cartoes',
        color: 'text-info'
      },
    ]
  },
  {
    title: 'Operações',
    items: [
      {
        title: 'Boletos',
        description: 'Emissão e gestão de boletos bancários',
        icon: Barcode,
        href: '/tesouraria/boletos',
        color: 'text-primary'
      },
      {
        title: 'Lotes de Pagamento',
        description: 'Borderô e aprovação de pagamentos',
        icon: FileText,
        href: '/tesouraria/bordero',
        color: 'text-info'
      },
      {
        title: 'Central de Arquivos (CNAB)',
        description: 'Remessas e retornos bancários',
        icon: FolderSync,
        href: '/tesouraria/cnab',
        color: 'text-warning'
      },
    ]
  },
  {
    title: 'Crédito & Títulos',
    items: [
      {
        title: 'Empréstimos e Financiamentos',
        description: 'Contratos, parcelas e geração de títulos',
        icon: Landmark,
        href: '/tesouraria/contratos',
        color: 'text-primary'
      },
      {
        title: 'Cheques',
        description: 'Gestão de cheques emitidos e recebidos',
        icon: FileCheck,
        href: '/tesouraria/cheques',
        color: 'text-muted-foreground'
      },
    ]
  },
];

export default function TesourariaIndex() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tesouraria"
          description="Gestão de caixa, bancos e operações financeiras"
        />

        {/* KPIs */}
        <TreasuryKPIs />

        {/* Cash Flow Chart */}
        <CashFlowMiniChart />

        {/* Quick Actions */}
        <div className="py-2">
          <TreasuryQuickActions />
        </div>

        {/* Menu Sections */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
          {menuSections.map((section) => (
            <TreasuryMenuSection
              key={section.title}
              title={section.title}
              items={section.items}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
