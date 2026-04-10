import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, Shield, Clock, Smartphone, Lock, Eye, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Security() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Segurança"
          description="Configure políticas de segurança e autenticação"
        />

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Autenticação Multi-Fator (MFA)
              </CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir MFA para Admins</Label>
                  <p className="text-xs text-muted-foreground">
                    Administradores devem usar autenticação de dois fatores
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir MFA para Todos</Label>
                  <p className="text-xs text-muted-foreground">
                    Todos os usuários devem usar MFA
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Métodos Permitidos</Label>
                  <p className="text-xs text-muted-foreground">
                    Autenticadores aceitos
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline">TOTP</Badge>
                  <Badge variant="outline">SMS</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Políticas de Sessão
              </CardTitle>
              <CardDescription>
                Configure expiração e comportamento de sessões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tempo de Inatividade</Label>
                  <p className="text-xs text-muted-foreground">
                    Desconectar após inatividade
                  </p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sessões Simultâneas</Label>
                  <p className="text-xs text-muted-foreground">
                    Máximo de dispositivos por usuário
                  </p>
                </div>
                <Select defaultValue="3">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dispositivo</SelectItem>
                    <SelectItem value="3">3 dispositivos</SelectItem>
                    <SelectItem value="5">5 dispositivos</SelectItem>
                    <SelectItem value="unlimited">Ilimitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembrar Dispositivo</Label>
                  <p className="text-xs text-muted-foreground">
                    Permitir "lembrar este dispositivo"
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Políticas de Senha
              </CardTitle>
              <CardDescription>
                Requisitos mínimos para senhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Comprimento Mínimo</Label>
                </div>
                <Select defaultValue="8">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 caracteres</SelectItem>
                    <SelectItem value="8">8 caracteres</SelectItem>
                    <SelectItem value="10">10 caracteres</SelectItem>
                    <SelectItem value="12">12 caracteres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir Caracteres Especiais</Label>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir Números</Label>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir Maiúsculas e Minúsculas</Label>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Logs de Auditoria
              </CardTitle>
              <CardDescription>
                Configurações de rastreamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Registrar Logins</Label>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Registrar Alterações de Dados</Label>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Retenção de Logs</Label>
                </div>
                <Select defaultValue="365">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                    <SelectItem value="730">2 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Aviso de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              As configurações de segurança são aplicadas para toda a empresa e afetam todos os usuários.
              Alterações em políticas de MFA e sessão podem desconectar usuários ativos.
              Recomendamos comunicar mudanças antes de aplicá-las.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
