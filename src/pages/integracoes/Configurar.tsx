import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useIntegration, 
  useIntegrationAccounts, 
  useUpdateIntegration,
  useCreateIntegrationAccount,
  useUpdateIntegrationAccount,
  useCategorizationRules,
  useCreateCategorizationRule,
  useDeleteCategorizationRule,
} from '@/hooks/useIntegrations';
import { useWallets, useAccounts } from '@/hooks/useCompanyData';
import { ArrowLeft, Plus, Trash2, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Configurar() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const navigate = useNavigate();
  
  const { data: integration, isLoading } = useIntegration(integrationId || null);
  const { data: integrationAccounts } = useIntegrationAccounts(integrationId || null);
  const { data: wallets } = useWallets();
  const { data: accounts } = useAccounts();
  const { data: rules } = useCategorizationRules(integrationId || undefined);
  
  const updateIntegration = useUpdateIntegration();
  const createAccount = useCreateIntegrationAccount();
  const updateAccount = useUpdateIntegrationAccount();
  const createRule = useCreateCategorizationRule();
  const deleteRule = useDeleteCategorizationRule();

  const [name, setName] = useState('');
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [autoCreate, setAutoCreate] = useState(false);
  const [reconcileThreshold, setReconcileThreshold] = useState(90);
  const [dateTolerance, setDateTolerance] = useState(3);

  // New rule state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleKeywords, setNewRuleKeywords] = useState('');
  const [newRuleAccountId, setNewRuleAccountId] = useState('');
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);

  // Initialize form when integration loads
  useEffect(() => {
    if (integration) {
      setName(integration.name);
      const settings = integration.settings_json as Record<string, unknown> || {};
      setAutoReconcile(settings.autoReconcile !== false);
      setAutoCreate(settings.autoCreate === true);
      setReconcileThreshold(typeof settings.reconcileThreshold === 'number' ? settings.reconcileThreshold : 90);
      setDateTolerance(typeof settings.dateTolerance === 'number' ? settings.dateTolerance : 3);
    }
  }, [integration]);

  const handleSave = async () => {
    if (!integrationId) return;
    
    try {
      await updateIntegration.mutateAsync({
        id: integrationId,
        data: {
          name: name || integration?.name,
          settings_json: {
            autoReconcile,
            autoCreate,
            reconcileThreshold,
            dateTolerance,
          },
        },
      });
      toast.success('Configurações salvas');
    } catch (err) {
      toast.error('Erro ao salvar');
    }
  };

  const handleMapWallet = async (accountId: string, walletId: string) => {
    try {
      await updateAccount.mutateAsync({
        id: accountId,
        walletId: walletId || null,
      });
    } catch (err) {
      toast.error('Erro ao mapear conta');
    }
  };

  const handleCreateRule = async () => {
    if (!newRuleName || !newRuleKeywords) {
      toast.error('Preencha nome e palavras-chave');
      return;
    }

    try {
      await createRule.mutateAsync({
        name: newRuleName,
        integration_id: integrationId || null,
        conditions_json: {
          keywords: newRuleKeywords.split(',').map(k => k.trim()).filter(Boolean),
        },
        account_id: newRuleAccountId || null,
      });
      setIsRuleDialogOpen(false);
      setNewRuleName('');
      setNewRuleKeywords('');
      setNewRuleAccountId('');
    } catch (err) {
      toast.error('Erro ao criar regra');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title={`Configurar - ${integration?.name || ''}`}
        description="Ajuste as configurações de importação e conciliação"
      >
        <Button variant="outline" onClick={() => navigate('/integracoes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Voltar
        </Button>
      </PageHeader>

      <Tabs defaultValue="general" className="mt-6">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="accounts">Mapeamento de Contas</TabsTrigger>
          <TabsTrigger value="rules">Regras de Categorização</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Integração</Label>
                <Input
                  value={name || integration?.name || ''}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Banco Itaú"
                />
              </div>
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Input value={integration?.provider || ''} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Configurações de Conciliação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Conciliação Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Baixar automaticamente transações com alta confiança
                  </p>
                </div>
                <Switch checked={autoReconcile} onCheckedChange={setAutoReconcile} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Criar Lançamentos Automaticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Criar lançamentos para transações sem match
                  </p>
                </div>
                <Switch checked={autoCreate} onCheckedChange={setAutoCreate} />
              </div>

              <div className="space-y-2">
                <Label>Limite de Confiança para Auto-Baixa (%)</Label>
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={reconcileThreshold}
                  onChange={(e) => setReconcileThreshold(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Transações com confiança acima deste valor serão baixadas automaticamente
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tolerância de Data (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={dateTolerance}
                  onChange={(e) => setDateTolerance(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Diferença máxima de dias entre data do extrato e vencimento
                </p>
              </div>

              <Button onClick={handleSave} disabled={updateIntegration.isPending}>
                <Save className="mr-2 h-4 w-4" />Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapeamento de Contas</CardTitle>
              <CardDescription>
                Vincule contas do extrato às suas carteiras internas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integrationAccounts?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conta externa detectada. Importe um extrato para mapear contas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta Externa</TableHead>
                      <TableHead>ID Externo</TableHead>
                      <TableHead>Carteira Interna</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrationAccounts?.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell>{acc.external_account_name || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{acc.external_account_id}</TableCell>
                        <TableCell>
                          <Select
                            value={acc.wallet_id || '__none__'}
                            onValueChange={(v) => handleMapWallet(acc.id, v === '__none__' ? '' : v)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Não mapeado</SelectItem>
                              {wallets?.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={acc.wallet_id ? 'default' : 'outline'}>
                            {acc.wallet_id ? 'Mapeado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Regras de Categorização</CardTitle>
                <CardDescription>
                  Defina regras para categorizar transações automaticamente
                </CardDescription>
              </div>
              <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />Nova Regra
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Regra de Categorização</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome da Regra</Label>
                      <Input
                        placeholder="Ex: Uber → Transporte"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Palavras-chave (separadas por vírgula)</Label>
                      <Input
                        placeholder="uber, 99, taxi"
                        value={newRuleKeywords}
                        onChange={(e) => setNewRuleKeywords(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        A regra será aplicada se a descrição contiver qualquer uma das palavras
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Conta Contábil</Label>
                      <Select value={newRuleAccountId} onValueChange={setNewRuleAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts?.filter(a => a.is_active).map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateRule} className="w-full" disabled={createRule.isPending}>
                      Criar Regra
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {rules?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma regra definida. Crie regras para automatizar a categorização.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Palavras-chave</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules?.map((rule) => {
                      const conditions = rule.conditions_json as { keywords?: string[] } || {};
                      const account = accounts?.find(a => a.id === rule.account_id);
                      return (
                        <TableRow key={rule.id}>
                          <TableCell>{rule.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {conditions.keywords?.slice(0, 3).map((kw, i) => (
                                <Badge key={i} variant="outline">{kw}</Badge>
                              ))}
                              {(conditions.keywords?.length || 0) > 3 && (
                                <Badge variant="outline">+{(conditions.keywords?.length || 0) - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{account?.name || '-'}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteRule.mutate(rule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
