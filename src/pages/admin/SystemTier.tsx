import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  useCompanyTierSettings, 
  useModuleTemplates, 
  useApplyTierTemplate, 
  useTierHistory,
  useFeatureFlags,
  useUpdateFeatureFlag,
  getTierLabel, 
  getTierDescription,
  FEATURE_CATEGORIES,
  FEATURE_LABELS,
  type SystemTier 
} from "@/hooks/useSystemTier";
import { 
  Settings, 
  Building2, 
  Calculator, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  History,
  Sparkles,
  Lock,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

const TIER_ICONS: Record<SystemTier, React.ReactNode> = {
  'FINANCEIRO_ESSENCIAL': <Building2 className="h-6 w-6" />,
  'FINANCEIRO_CONTABIL': <Calculator className="h-6 w-6" />,
  'FINANCEIRO_CONTABIL_FISCAL': <FileText className="h-6 w-6" />,
};

const TIER_COLORS: Record<SystemTier, string> = {
  'FINANCEIRO_ESSENCIAL': 'border-blue-500 bg-blue-50 dark:bg-blue-950',
  'FINANCEIRO_CONTABIL': 'border-purple-500 bg-purple-50 dark:bg-purple-950',
  'FINANCEIRO_CONTABIL_FISCAL': 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950',
};

export default function SystemTierPage() {
  const { data: tierSettings, isLoading: loadingSettings } = useCompanyTierSettings();
  const { data: templates } = useModuleTemplates();
  const { data: history } = useTierHistory();
  const { data: flags } = useFeatureFlags();
  const applyTier = useApplyTierTemplate();
  const updateFlag = useUpdateFeatureFlag();

  const [selectedTier, setSelectedTier] = useState<SystemTier | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [accountingStartDate, setAccountingStartDate] = useState("");
  const [fiscalStartDate, setFiscalStartDate] = useState("");

  const currentTier = tierSettings?.system_tier || 'FINANCEIRO_ESSENCIAL';
  const tiers: SystemTier[] = ['FINANCEIRO_ESSENCIAL', 'FINANCEIRO_CONTABIL', 'FINANCEIRO_CONTABIL_FISCAL'];

  const handleTierChange = (tier: SystemTier) => {
    if (tier === currentTier) return;
    setSelectedTier(tier);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleWizardComplete = async () => {
    if (!selectedTier) return;
    
    await applyTier.mutateAsync({
      tier: selectedTier,
      accountingStartDate: accountingStartDate || undefined,
      fiscalStartDate: fiscalStartDate || undefined,
    });
    
    setWizardOpen(false);
    setSelectedTier(null);
    setAccountingStartDate("");
    setFiscalStartDate("");
  };

  const isUpgrade = selectedTier && tiers.indexOf(selectedTier) > tiers.indexOf(currentTier);
  const isDowngrade = selectedTier && tiers.indexOf(selectedTier) < tiers.indexOf(currentTier);

  const getWizardSteps = () => {
    if (!selectedTier) return [];
    
    if (selectedTier === 'FINANCEIRO_CONTABIL' && currentTier === 'FINANCEIRO_ESSENCIAL') {
      return [
        { title: 'Data de Início', description: 'Defina a partir de quando a contabilidade será ativada' },
        { title: 'Checklist', description: 'Verifique os pré-requisitos' },
        { title: 'Confirmação', description: 'Revise e confirme as alterações' },
      ];
    }
    
    if (selectedTier === 'FINANCEIRO_CONTABIL_FISCAL') {
      return [
        { title: 'Data de Início Contábil', description: 'Defina quando a contabilidade iniciará (se ainda não ativa)' },
        { title: 'Data de Início Fiscal', description: 'Defina quando o módulo fiscal iniciará' },
        { title: 'Checklist Fiscal', description: 'Verifique cadastros fiscais mínimos' },
        { title: 'Confirmação', description: 'Revise e confirme as alterações' },
      ];
    }
    
    if (isDowngrade) {
      return [
        { title: 'Aviso', description: 'Entenda o impacto do downgrade' },
        { title: 'Confirmação', description: 'Confirme a desativação' },
      ];
    }
    
    return [{ title: 'Confirmação', description: 'Confirme as alterações' }];
  };

  const wizardSteps = getWizardSteps();

  const isFlagEnabled = (key: string) => flags?.find(f => f.feature_key === key)?.enabled ?? false;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Nível do Sistema"
          description="Configure os módulos habilitados para sua empresa"
        >
          <Badge variant="outline" className="text-sm">
            <Sparkles className="mr-1 h-3 w-3" />
            {getTierLabel(currentTier)}
          </Badge>
        </PageHeader>

        <Tabs defaultValue="tier" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tier">Nível do Sistema</TabsTrigger>
            <TabsTrigger value="flags">Feature Flags</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="tier" className="space-y-4">
            {/* Current Tier Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Nível Atual
                </CardTitle>
                <CardDescription>
                  {getTierDescription(currentTier)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm">Financeiro: Ativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {tierSettings?.accounting_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      Contabilidade: {tierSettings?.accounting_enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {tierSettings?.fiscal_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      Fiscal: {tierSettings?.fiscal_enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                {tierSettings?.accounting_start_date && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Contabilidade desde: {format(new Date(tierSettings.accounting_start_date), "dd/MM/yyyy")}
                  </div>
                )}
                {tierSettings?.fiscal_start_date && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Fiscal desde: {format(new Date(tierSettings.fiscal_start_date), "dd/MM/yyyy")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tier Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Alterar Nível</CardTitle>
                <CardDescription>
                  Selecione o nível desejado para sua empresa. Um assistente guiará você na ativação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={currentTier} className="grid gap-4 md:grid-cols-3">
                  {tiers.map((tier) => {
                    const isActive = tier === currentTier;
                    const template = templates?.find(t => t.template_key === tier);
                    
                    return (
                      <div key={tier} className="relative">
                        <RadioGroupItem
                          value={tier}
                          id={tier}
                          className="peer sr-only"
                          disabled={isActive}
                        />
                        <Label
                          htmlFor={tier}
                          onClick={() => handleTierChange(tier)}
                          className={`flex flex-col gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary ${
                            isActive ? TIER_COLORS[tier] : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              {TIER_ICONS[tier]}
                            </div>
                            {isActive && (
                              <Badge>Atual</Badge>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{getTierLabel(tier)}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {template?.description}
                            </p>
                          </div>
                          {!isActive && (
                            <Button variant="outline" size="sm" className="w-full">
                              {tiers.indexOf(tier) > tiers.indexOf(currentTier) ? 'Fazer Upgrade' : 'Fazer Downgrade'}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flags" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Feature Flags Avançadas</AlertTitle>
              <AlertDescription>
                Ajuste fino de funcionalidades. Alterações aqui sobrescrevem o template do nível selecionado.
              </AlertDescription>
            </Alert>

            {Object.entries(FEATURE_CATEGORIES).map(([category, featureKeys]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {featureKeys.map((key) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={key}>{FEATURE_LABELS[key] || key}</Label>
                        </div>
                        <Switch
                          id={key}
                          checked={isFlagEnabled(key)}
                          onCheckedChange={(checked) => updateFlag.mutate({ featureKey: key, enabled: checked })}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Alterações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history?.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma alteração registrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>De</TableHead>
                        <TableHead>Para</TableHead>
                        <TableHead>Início Contábil</TableHead>
                        <TableHead>Início Fiscal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history?.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell>{format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>
                            {h.from_tier ? getTierLabel(h.from_tier) : '-'}
                          </TableCell>
                          <TableCell>{getTierLabel(h.to_tier)}</TableCell>
                          <TableCell>
                            {h.accounting_start_date 
                              ? format(new Date(h.accounting_start_date), "dd/MM/yyyy") 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {h.fiscal_start_date 
                              ? format(new Date(h.fiscal_start_date), "dd/MM/yyyy") 
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Wizard Dialog */}
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isUpgrade ? 'Upgrade de Nível' : 'Alteração de Nível'}: {selectedTier && getTierLabel(selectedTier)}
              </DialogTitle>
              <DialogDescription>
                {wizardSteps[wizardStep - 1]?.description}
              </DialogDescription>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center gap-2 py-4">
              {wizardSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    idx + 1 === wizardStep 
                      ? 'bg-primary text-primary-foreground' 
                      : idx + 1 < wizardStep 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {idx + 1 < wizardStep ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className={`text-sm ${idx + 1 === wizardStep ? 'font-medium' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                  {idx < wizardSteps.length - 1 && (
                    <Separator className="w-8" />
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Wizard Content */}
            <div className="py-4">
              {selectedTier === 'FINANCEIRO_CONTABIL' && wizardStep === 1 && (
                <div className="space-y-4">
                  <Label htmlFor="accountingStartDate">Data de Início da Contabilidade</Label>
                  <Input
                    id="accountingStartDate"
                    type="date"
                    value={accountingStartDate}
                    onChange={(e) => setAccountingStartDate(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    A partir desta data, baixas, estornos e movimentações gerarão lançamentos contábeis (GL).
                  </p>
                </div>
              )}

              {selectedTier === 'FINANCEIRO_CONTABIL' && wizardStep === 2 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Pré-requisitos para Contabilidade</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm">Plano de Contas configurado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm">Regras de Contabilização (Posting Rules) definidas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm">Contas transitórias configuradas</span>
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Você pode configurar estes itens após a ativação. A contabilização só ocorrerá a partir da data de início.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {selectedTier === 'FINANCEIRO_CONTABIL_FISCAL' && wizardStep === 1 && (
                <div className="space-y-4">
                  <Label htmlFor="accountingStartDate">Data de Início da Contabilidade</Label>
                  <Input
                    id="accountingStartDate"
                    type="date"
                    value={accountingStartDate}
                    onChange={(e) => setAccountingStartDate(e.target.value)}
                    disabled={tierSettings?.accounting_enabled}
                  />
                  {tierSettings?.accounting_enabled && (
                    <p className="text-sm text-muted-foreground">
                      Contabilidade já está ativa desde {tierSettings.accounting_start_date && format(new Date(tierSettings.accounting_start_date), "dd/MM/yyyy")}.
                    </p>
                  )}
                </div>
              )}

              {selectedTier === 'FINANCEIRO_CONTABIL_FISCAL' && wizardStep === 2 && (
                <div className="space-y-4">
                  <Label htmlFor="fiscalStartDate">Data de Início do Módulo Fiscal</Label>
                  <Input
                    id="fiscalStartDate"
                    type="date"
                    value={fiscalStartDate}
                    onChange={(e) => setFiscalStartDate(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    A partir desta data, será possível emitir documentos fiscais (NF-e, NFS-e).
                  </p>
                </div>
              )}

              {selectedTier === 'FINANCEIRO_CONTABIL_FISCAL' && wizardStep === 3 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Pré-requisitos Fiscais</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <span className="text-sm">Cadastros NCM/CFOP/CST configurados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <span className="text-sm">Regimes tributários definidos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <span className="text-sm">Provedor fiscal configurado (NF-e/NFS-e)</span>
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Você poderá configurar estes itens após a ativação. A emissão de documentos fiscais só funcionará com cadastros completos.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {isDowngrade && wizardStep === 1 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Atenção: Downgrade</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p>Ao fazer downgrade:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Os módulos desativados serão ocultados na interface</li>
                      <li>Novas operações não gerarão dados nos módulos desativados</li>
                      <li>O histórico existente será mantido (não será apagado)</li>
                      <li>Você poderá fazer upgrade novamente no futuro</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {wizardStep === wizardSteps.length && (
                <div className="space-y-4">
                  <h4 className="font-medium">Resumo da Alteração</h4>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">De:</span>
                      <span>{getTierLabel(currentTier)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Para:</span>
                      <span className="font-medium">{selectedTier && getTierLabel(selectedTier)}</span>
                    </div>
                    {accountingStartDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Início Contabilidade:</span>
                        <span>{format(new Date(accountingStartDate), "dd/MM/yyyy")}</span>
                      </div>
                    )}
                    {fiscalStartDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Início Fiscal:</span>
                        <span>{format(new Date(fiscalStartDate), "dd/MM/yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setWizardOpen(false)}>
                Cancelar
              </Button>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={() => setWizardStep(s => s - 1)}>
                  Voltar
                </Button>
              )}
              {wizardStep < wizardSteps.length ? (
                <Button onClick={() => setWizardStep(s => s + 1)}>
                  Próximo
                </Button>
              ) : (
                <Button 
                  onClick={handleWizardComplete}
                  disabled={applyTier.isPending}
                >
                  {applyTier.isPending ? 'Aplicando...' : 'Confirmar Alteração'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
