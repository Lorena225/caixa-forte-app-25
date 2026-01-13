import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Percent, FileText, Settings } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { useFiscalTaxRules } from '@/hooks/useFiscalRegistrations';

export default function FiscalRegras() {
  const { data: rules = [], isLoading } = useFiscalTaxRules();

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Regras de Impostos"
          description="Configuração de alíquotas e regras tributárias"
          action={{
            label: 'Nova Regra',
            onClick: () => {},
            icon: <Settings className="h-4 w-4" />,
          }}
        />

        <Tabs defaultValue="regras" className="space-y-4">
          <TabsList>
            <TabsTrigger value="regras" className="gap-2">
              <Receipt className="h-4 w-4" />
              Regras Fiscais
            </TabsTrigger>
            <TabsTrigger value="aliquotas" className="gap-2">
              <Percent className="h-4 w-4" />
              Alíquotas
            </TabsTrigger>
            <TabsTrigger value="cfop" className="gap-2">
              <FileText className="h-4 w-4" />
              CFOP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regras">
            <Card>
              <CardHeader>
                <CardTitle>Regras Tributárias</CardTitle>
                <CardDescription>
                  Configure as regras de cálculo de impostos por operação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : rules.length === 0 ? (
                  <EmptyState
                    icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
                    title="Nenhuma regra cadastrada"
                    description="Configure regras para automatizar o cálculo de impostos."
                    actions={[]}
                  />
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Prioridade: {rule.priority}
                          </p>
                        </div>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aliquotas">
            <Card>
              <CardHeader>
                <CardTitle>Tabela de Alíquotas</CardTitle>
                <CardDescription>
                  Alíquotas por UF, NCM e regime tributário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={<Percent className="h-8 w-8 text-muted-foreground" />}
                  title="Configure as alíquotas"
                  description="Defina as alíquotas de ICMS, IPI, PIS/COFINS por estado e produto."
                  actions={[]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cfop">
            <Card>
              <CardHeader>
                <CardTitle>Códigos CFOP</CardTitle>
                <CardDescription>
                  Mapeamento de operações fiscais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                  title="CFOPs configurados automaticamente"
                  description="Os códigos CFOP são carregados da tabela oficial e podem ser customizados."
                  actions={[]}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
