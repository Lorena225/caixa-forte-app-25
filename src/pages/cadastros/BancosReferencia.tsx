import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useBanksReference } from '@/hooks/useBanksReference';
import { Building2, Search, CheckCircle2, XCircle } from 'lucide-react';

export default function BancosReferencia() {
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');
  const { data: banks = [], isLoading } = useBanksReference(!showInactive);

  const filteredBanks = banks.filter((bank) => {
    const searchLower = search.toLowerCase();
    return (
      bank.compe_code.includes(search) ||
      bank.name.toLowerCase().includes(searchLower) ||
      bank.display_name.toLowerCase().includes(searchLower) ||
      (bank.ispb && bank.ispb.includes(search))
    );
  });

  const columns = [
    {
      key: 'compe_code',
      header: 'Código COMPE',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-mono font-medium">{item.compe_code}</span>
        </div>
      ),
      className: 'w-36',
    },
    {
      key: 'display_name',
      header: 'Nome para Exibição',
      render: (item: any) => (
        <span className="font-medium">{item.display_name}</span>
      ),
    },
    {
      key: 'name',
      header: 'Nome Oficial',
      render: (item: any) => (
        <span className="text-muted-foreground text-sm">{item.name}</span>
      ),
    },
    {
      key: 'ispb',
      header: 'ISPB',
      render: (item: any) => (
        <span className="font-mono text-sm">{item.ispb || '-'}</span>
      ),
      className: 'w-28',
    },
    {
      key: 'bank_type',
      header: 'Tipo',
      render: (item: any) => (
        <Badge variant={item.bank_type === 'official' ? 'default' : 'secondary'}>
          {item.bank_type === 'official' ? 'Oficial' : 'Manual'}
        </Badge>
      ),
      className: 'w-24',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: any) => (
        <div className="flex items-center gap-1.5">
          {item.is_active ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-success">Ativo</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Inativo</span>
            </>
          )}
        </div>
      ),
      className: 'w-24',
    },
    {
      key: 'source',
      header: 'Fonte',
      render: (item: any) => (
        <span className="text-xs text-muted-foreground">{item.source}</span>
      ),
      className: 'w-32',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Bancos (Referência FEBRABAN)"
          description="Lista oficial de bancos do Sistema Financeiro Nacional. Esta lista é somente leitura."
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nome ou ISPB..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-input"
            />
            Mostrar inativos
          </label>
        </div>

        <DataTable
          columns={columns}
          data={filteredBanks}
          loading={isLoading}
          emptyMessage="Nenhum banco encontrado."
        />

        <div className="text-sm text-muted-foreground">
          Total: {filteredBanks.length} banco(s) {showInactive ? '' : 'ativo(s)'}
        </div>
      </div>
    </MainLayout>
  );
}
