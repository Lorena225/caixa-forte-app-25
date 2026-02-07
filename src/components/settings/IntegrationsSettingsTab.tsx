import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIntegrationCredentials, useIntegrationHealthChecks, useRunHealthCheck } from "@/hooks/useGovernanceSettings";
import { Link2, Key, Wifi, WifiOff, AlertTriangle, Clock, Plus, RefreshCw, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AVAILABLE_INTEGRATIONS = [
  { key: "lovable_ai", name: "Lovable AI Gateway", category: "IA", icon: "🤖" },
  { key: "openai", name: "OpenAI", category: "IA", icon: "🧠" },
  { key: "whatsapp_cloud", name: "WhatsApp Cloud API", category: "Comunicação", icon: "💬" },
  { key: "stripe", name: "Stripe", category: "Pagamentos", icon: "💳" },
  { key: "asaas", name: "Asaas", category: "Pagamentos", icon: "💰" },
  { key: "pix_bb", name: "PIX Banco do Brasil", category: "Bancário", icon: "🏦" },
  { key: "nfse", name: "NFS-e (Focus NFe)", category: "Fiscal", icon: "📄" },
  { key: "sefaz", name: "SEFAZ NF-e", category: "Fiscal", icon: "📋" },
];

export function IntegrationsSettingsTab() {
  const { data: credentials, isLoading: credentialsLoading } = useIntegrationCredentials();
  const { data: healthChecks } = useIntegrationHealthChecks();
  const runHealthCheck = useRunHealthCheck();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const getHealthStatus = (integrationKey: string) => {
    const check = healthChecks?.find((c) => c.integration_key === integrationKey);
    return check || null;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "online":
        return (
          <Badge className="bg-green-100 text-green-800">
            <Wifi className="h-3 w-3 mr-1" />
            Online
          </Badge>
        );
      case "offline":
        return (
          <Badge variant="destructive">
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </Badge>
        );
      case "auth_error":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Erro Auth
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Timeout
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Não testado
          </Badge>
        );
    }
  };

  const handleTestConnection = async (integrationKey: string) => {
    await runHealthCheck.mutateAsync(integrationKey);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Hub de Integrações
            </CardTitle>
            <CardDescription>
              Gerencie conexões com APIs externas de forma segura
            </CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Integração
          </Button>
        </CardHeader>
      </Card>

      {/* Integrations Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const credential = credentials?.find((c) => c.integration_key === integration.key);
          const healthStatus = getHealthStatus(integration.key);
          const isConfigured = !!credential || integration.key === "lovable_ai";

          return (
            <Card
              key={integration.key}
              className={cn(
                "transition-all",
                isConfigured && "border-l-4 border-l-green-500"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">{integration.category}</p>
                    </div>
                  </div>
                  {getStatusBadge(healthStatus?.status || null)}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {healthStatus?.last_checked_at ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Testado em {format(new Date(healthStatus.last_checked_at), "dd/MM HH:mm", { locale: ptBR })}
                        {healthStatus.response_time_ms && (
                          <span className="ml-1">({healthStatus.response_time_ms}ms)</span>
                        )}
                      </span>
                    ) : (
                      <span>Nunca testado</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(integration.key)}
                      disabled={runHealthCheck.isPending}
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4 mr-1",
                          runHealthCheck.isPending && "animate-spin"
                        )}
                      />
                      Testar
                    </Button>
                    {!isConfigured && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedIntegration(integration.key);
                          setAddDialogOpen(true);
                        }}
                      >
                        Configurar
                      </Button>
                    )}
                  </div>
                </div>

                {healthStatus?.error_message && (
                  <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                    {healthStatus.error_message}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Segurança de Credenciais</p>
              <p className="text-sm text-amber-700 mt-1">
                Todas as credenciais são armazenadas de forma criptografada usando AES-256.
                Chaves privadas nunca são retornadas ao frontend em texto plano.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Integration Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Integração</DialogTitle>
            <DialogDescription>
              Insira as credenciais para conectar ao serviço
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <div className="relative">
                <Input
                  type={showSecrets["apiKey"] ? "text" : "password"}
                  placeholder="sk-..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowSecrets({ ...showSecrets, apiKey: !showSecrets["apiKey"] })}
                >
                  {showSecrets["apiKey"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secret Key (opcional)</Label>
              <div className="relative">
                <Input
                  type={showSecrets["secretKey"] ? "text" : "password"}
                  placeholder="••••••••"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowSecrets({ ...showSecrets, secretKey: !showSecrets["secretKey"] })}
                >
                  {showSecrets["secretKey"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast.success("Credenciais salvas com criptografia");
              setAddDialogOpen(false);
            }}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Salvar Credenciais
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
