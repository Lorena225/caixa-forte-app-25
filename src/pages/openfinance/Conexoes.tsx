import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { useOpenFinanceConnections } from "@/hooks/useInnovationPlatform";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Landmark,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Link2,
  Unlink,
  Building2,
  Wallet,
  ArrowDownUp,
  Shield,
  ExternalLink,
} from "lucide-react";

// Mock banks for demonstration
const AVAILABLE_BANKS = [
  { id: "001", name: "Banco do Brasil", logo: "🏛️", supports: ["data", "payment"] },
  { id: "033", name: "Santander", logo: "🔴", supports: ["data", "payment"] },
  { id: "104", name: "Caixa Econômica", logo: "🟦", supports: ["data"] },
  { id: "237", name: "Bradesco", logo: "🔵", supports: ["data", "payment"] },
  { id: "341", name: "Itaú", logo: "🟠", supports: ["data", "payment"] },
  { id: "756", name: "Sicoob", logo: "🟢", supports: ["data"] },
  { id: "077", name: "Inter", logo: "🟧", supports: ["data", "payment"] },
  { id: "260", name: "Nubank", logo: "💜", supports: ["data", "payment"] },
];

// Mock connected accounts
const MOCK_CONNECTIONS = [
  {
    id: "1",
    institution_id: "341",
    institution_name: "Itaú",
    connection_type: "both",
    status: "connected",
    last_sync_at: new Date().toISOString(),
    accounts_linked: [
      { type: "checking", number: "****1234", balance: 45000 },
      { type: "savings", number: "****5678", balance: 120000 },
    ],
    consent_expires_at: new Date(Date.now() + 86400000 * 180).toISOString(),
  },
  {
    id: "2",
    institution_id: "237",
    institution_name: "Bradesco",
    connection_type: "data",
    status: "connected",
    last_sync_at: new Date(Date.now() - 3600000).toISOString(),
    accounts_linked: [
      { type: "checking", number: "****9012", balance: 28500 },
    ],
    consent_expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
  },
];

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "text-warning", icon: Clock },
  connected: { label: "Conectado", color: "text-success", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "text-destructive", icon: AlertCircle },
  revoked: { label: "Revogado", color: "text-muted-foreground", icon: Unlink },
  error: { label: "Erro", color: "text-destructive", icon: AlertCircle },
};

export default function OpenFinanceConexoes() {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<typeof AVAILABLE_BANKS[0] | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: dbConnections = [], isLoading } = useOpenFinanceConnections();

  // Use mock data for demo
  const connections = MOCK_CONNECTIONS;

  const totalBalance = connections.reduce((sum, conn) => {
    const accountsBalance = (conn.accounts_linked as any[]).reduce((s, a) => s + (a.balance || 0), 0);
    return sum + accountsBalance;
  }, 0);

  const handleConnect = async () => {
    if (!selectedBank) return;
    setIsConnecting(true);
    // Simulate OAuth flow
    await new Promise((r) => setTimeout(r, 2000));
    setIsConnecting(false);
    setConnectDialogOpen(false);
    toast.success(`Conexão com ${selectedBank.name} iniciada! Redirecionando para autorização...`);
  };

  const handleSync = async (connectionId: string) => {
    toast.info("Sincronizando dados...");
    await new Promise((r) => setTimeout(r, 1500));
    toast.success("Dados sincronizados com sucesso!");
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Open Finance - Conexões Bancárias"
          description="Conecte suas contas bancárias via Open Finance Brasil"
        >
          <Button onClick={() => setConnectDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conexão
          </Button>
        </PageHeader>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bancos Conectados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connections.length}</div>
              <p className="text-xs text-muted-foreground">instituições</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contas Vinculadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connections.reduce((s, c) => s + (c.accounts_linked as any[]).length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">contas bancárias</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Consolidado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalBalance)}</div>
              <p className="text-xs text-muted-foreground">via Open Finance</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Última Sincronização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Agora</div>
              <p className="text-xs text-muted-foreground">dados atualizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Connections List */}
        {connections.length === 0 ? (
          <EmptyState
            icon={<Landmark className="h-8 w-8 text-muted-foreground" />}
            title="Nenhuma conexão bancária"
            description="Conecte suas contas via Open Finance para sincronizar saldos e extratos automaticamente"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {connections.map((conn) => {
              const StatusIcon = STATUS_CONFIG[conn.status as keyof typeof STATUS_CONFIG]?.icon || CheckCircle2;
              const statusConfig = STATUS_CONFIG[conn.status as keyof typeof STATUS_CONFIG];
              const bank = AVAILABLE_BANKS.find((b) => b.id === conn.institution_id);

              return (
                <Card key={conn.id} className="card-hover">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{bank?.logo || "🏦"}</div>
                        <div>
                          <CardTitle className="text-base">{conn.institution_name}</CardTitle>
                          <CardDescription>
                            {conn.connection_type === "both" ? "Dados + Pagamentos" : "Apenas Dados"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={statusConfig?.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig?.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Linked Accounts */}
                      <div className="space-y-2">
                        {(conn.accounts_linked as any[]).map((account, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {account.type === "checking" ? "Conta Corrente" : "Poupança"} {account.number}
                              </span>
                            </div>
                            <span className="font-medium">{formatCurrency(account.balance)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>
                          Última sync: {format(new Date(conn.last_sync_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                        <span>
                          Expira: {format(new Date(conn.consent_expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleSync(conn.id)}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Sincronizar
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Unlink className="h-3 w-3" />
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        <Card className="border-success/20 bg-gradient-to-r from-success/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-success/10">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Segurança Open Finance Brasil</h4>
                <p className="text-sm text-muted-foreground">
                  As conexões utilizam o padrão oficial do Open Finance Brasil, regulado pelo Banco Central. 
                  Seus dados são criptografados e você mantém controle total sobre os consentimentos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connect Dialog */}
        <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Conectar Banco via Open Finance
              </DialogTitle>
              <DialogDescription>
                Selecione a instituição financeira para iniciar a autorização
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2 max-h-[300px] overflow-y-auto py-4">
              {AVAILABLE_BANKS.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedBank?.id === bank.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{bank.logo}</span>
                    <span className="font-medium">{bank.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {bank.supports.includes("data") && (
                      <Badge variant="outline" className="text-xs">Dados</Badge>
                    )}
                    {bank.supports.includes("payment") && (
                      <Badge variant="outline" className="text-xs">Pix</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!selectedBank || isConnecting}
                className="gap-2"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Autorizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
