import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileKey, Shield, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FiscalEmpresa() {
  const { currentCompany } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dados Fiscais da Empresa"
          description="Configurações tributárias e certificados"
        />

        <Tabs defaultValue="geral" className="space-y-4">
          <TabsList>
            <TabsTrigger value="geral" className="gap-2">
              <Building2 className="h-4 w-4" />
              Dados Gerais
            </TabsTrigger>
            <TabsTrigger value="regime" className="gap-2">
              <Settings className="h-4 w-4" />
              Regime Tributário
            </TabsTrigger>
            <TabsTrigger value="certificado" className="gap-2">
              <FileKey className="h-4 w-4" />
              Certificado Digital
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>
                  Dados cadastrais e inscrições fiscais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Razão Social</p>
                    <p className="font-medium">{currentCompany?.name || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">CNPJ</p>
                    <p className="font-medium">Não configurado</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Inscrição Estadual</p>
                    <p className="font-medium">Não configurado</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Inscrição Municipal</p>
                    <p className="font-medium">Não configurado</p>
                  </div>
                </div>
                <Button variant="outline">Editar Dados</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regime">
            <Card>
              <CardHeader>
                <CardTitle>Regime Tributário</CardTitle>
                <CardDescription>
                  Configuração do regime fiscal da empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium">Regime Atual</p>
                    <p className="text-sm text-muted-foreground">
                      Defina o regime tributário para cálculo correto dos impostos
                    </p>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Não Configurado
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { regime: 'Simples Nacional', description: 'ME e EPP' },
                    { regime: 'Lucro Presumido', description: 'Tributação simplificada' },
                    { regime: 'Lucro Real', description: 'Tributação sobre lucro efetivo' },
                  ].map((item) => (
                    <Card key={item.regime} className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="pt-4">
                        <p className="font-medium">{item.regime}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificado">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Certificado Digital
                </CardTitle>
                <CardDescription>
                  Certificado A1 para emissão de documentos fiscais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-dashed p-8 text-center">
                  <FileKey className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="font-medium">Nenhum certificado instalado</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Faça upload do seu certificado A1 (.pfx) para emitir NF-e e NFS-e
                  </p>
                  <Button>
                    Enviar Certificado
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>• O certificado deve estar no formato .pfx ou .p12</p>
                  <p>• A senha será solicitada no momento do upload</p>
                  <p>• O certificado é armazenado de forma criptografada</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
