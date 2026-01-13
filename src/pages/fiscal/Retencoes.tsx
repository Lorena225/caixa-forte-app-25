import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Percent, FileText, Calculator, Download } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

const retentionTypes = [
  { code: 'IRRF', name: 'Imposto de Renda Retido na Fonte', rate: '1.5% - 15%' },
  { code: 'ISS', name: 'Imposto Sobre Serviços', rate: '2% - 5%' },
  { code: 'INSS', name: 'Contribuição Previdenciária', rate: '11%' },
  { code: 'PCC', name: 'PIS/COFINS/CSLL', rate: '4.65%' },
];

export default function FiscalRetencoes() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Retenções"
          description="Gestão de impostos retidos na fonte"
          action={{
            label: 'Nova Retenção',
            onClick: () => {},
          }}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {retentionTypes.map((type) => (
            <Card key={type.code}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{type.code}</Badge>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">{type.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{type.rate}</p>
                <p className="text-xs text-muted-foreground">Alíquota padrão</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Retenções do Período
            </CardTitle>
            <CardDescription>
              Visualize e gerencie as retenções registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Calculator className="h-8 w-8 text-muted-foreground" />}
              title="Nenhuma retenção registrada"
              description="As retenções serão exibidas aqui conforme forem lançadas nos documentos fiscais."
              actions={[]}
            />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar DIRF
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar REINF
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
