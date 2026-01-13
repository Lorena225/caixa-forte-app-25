import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function NavigationSettings() {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Configurações de Navegação"
          description="Personalize menus, perfis de acesso e itens de navegação"
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Perfis de Navegação
                </CardTitle>
                <Badge variant="secondary">Em evolução</Badge>
              </div>
              <CardDescription>
                Configure quais itens de menu aparecem para cada perfil de usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>6 perfis configurados (Admin, Gestão, Tesouraria, AR, AP, Contábil)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Quick Actions por perfil ativo</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span>Editor visual em desenvolvimento</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Sincronização
              </CardTitle>
              <CardDescription>
                Estado da sincronização de preferências de navegação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Favoritos sincronizados com banco de dados</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Grupos colapsados persistidos</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Fallback para localStorage ativo</span>
              </div>
              <Button variant="outline" size="sm" className="w-full" disabled>
                <RefreshCw className="mr-2 h-4 w-4" />
                Forçar Sincronização
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funcionalidades Planejadas</CardTitle>
            <CardDescription>
              Próximas melhorias no sistema de navegação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Planejado</Badge>
                Editor visual drag-and-drop para reordenar itens de menu
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Planejado</Badge>
                Criação de perfis customizados por empresa
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Planejado</Badge>
                Personalização de labels por perfil
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Planejado</Badge>
                Dashboard customizado por perfil
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
