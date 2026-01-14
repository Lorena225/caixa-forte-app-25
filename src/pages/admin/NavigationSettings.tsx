import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { NavigationEditor } from '@/components/admin/NavigationEditor';
import { DashboardEditor } from '@/components/admin/DashboardEditor';
import { Settings, LayoutDashboard, Menu, Users } from 'lucide-react';

export default function NavigationSettings() {
  const [activeTab, setActiveTab] = useState('navigation');

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <BackButton />
          <div className="flex-1">
            <PageHeader
              title="Configurações de Navegação"
              description="Personalize menus, perfis de acesso e layout do dashboard"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="navigation" className="gap-2">
              <Menu className="h-4 w-4" />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Perfis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="navigation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Editor de Menu
                </CardTitle>
                <CardDescription>
                  Reordene itens de menu, personalize labels e controle a visibilidade por perfil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NavigationEditor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  Editor de Dashboard
                </CardTitle>
                <CardDescription>
                  Personalize os widgets, ordem e tamanho dos componentes do dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardEditor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Perfis de Acesso
                </CardTitle>
                <CardDescription>
                  Gerencie perfis personalizados por empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { key: 'PROFILE_ADMIN', name: 'Administrador', desc: 'Acesso total ao sistema' },
                    { key: 'PROFILE_GESTAO', name: 'Gestão', desc: 'Dashboard executivo e relatórios' },
                    { key: 'PROFILE_TESOURARIA', name: 'Tesouraria', desc: 'Contas, caixa e conciliação' },
                    { key: 'PROFILE_AR', name: 'Operação AR', desc: 'Contas a Receber e Cobrança' },
                    { key: 'PROFILE_AP', name: 'Operação AP', desc: 'Contas a Pagar e Compras' },
                    { key: 'PROFILE_CONTABIL', name: 'Contábil', desc: 'Contabilidade e Fiscal' },
                  ].map((profile) => (
                    <Card key={profile.key} className="border-dashed">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{profile.name}</p>
                            <p className="text-sm text-muted-foreground">{profile.desc}</p>
                          </div>
                          <Badge variant="secondary">Sistema</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Perfis Customizados</p>
                  <p>Em breve você poderá criar perfis personalizados para sua empresa, definindo quais módulos e funcionalidades cada grupo de usuários pode acessar.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
