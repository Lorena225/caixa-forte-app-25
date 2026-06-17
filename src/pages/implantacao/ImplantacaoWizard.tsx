import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormBody, FormSection, FormGrid, FormField } from '@/components/ui/form-layout';
import { Loader2, Landmark, Users, Layers, CheckCircle2, ArrowRight, Building2, Receipt, FolderKanban, Sparkles } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/useFinanceModule';
import { useCreateBankAccount, useCreatePartner, useCreateCostCenter } from '@/hooks/useImplantacaoWizard';

export default function ImplantacaoWizard() {
  const navigate = useNavigate();
  const { data: status, isLoading } = useOnboardingStatus();
  const createBank = useCreateBankAccount();
  const createPartner = useCreatePartner();
  const createCC = useCreateCostCenter();

  const [bank, setBank] = useState({ bank_code: '', bank_name: '', agency: '', account_number: '', account_type: 'checking' });
  const [partner, setPartner] = useState({ name: '', kind: 'cliente' as const, person_type: 'pj' as const });
  const [cc, setCC] = useState({ code: '', name: '' });

  const steps = [
    { key: 'company', label: 'Dados da empresa', icon: Building2, route: '/configuracoes/empresa', external: true },
    { key: 'accounts', label: 'Contas e carteiras', icon: Landmark, external: false },
    { key: 'partners', label: 'Clientes e fornecedores', icon: Users, external: false },
    { key: 'costCenters', label: 'Centros de custo', icon: Layers, external: false },
    { key: 'chartOfAccounts', label: 'Plano de contas', icon: Receipt, route: '/contabilidade/plano-contas', external: true },
    { key: 'taxParams', label: 'Parâmetros fiscais', icon: Receipt, route: '/fiscal/apuracao', external: true },
    { key: 'firstProject', label: 'Primeiro projeto', icon: FolderKanban, route: '/projetos', external: true, optional: true },
  ];

  const done = steps.filter((s) => status?.[s.key as keyof typeof status]).length;
  const pct = Math.round((done / steps.length) * 100);
  const allEssentialDone = steps.filter((s) => !s.optional).every((s) => status?.[s.key as keyof typeof status]);

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader title="Implantação do sistema"
          description="Cadastre os dados essenciais para tirar o Vitrio do estado inicial e começar a operar de verdade." />

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base">Progresso da implantação</span>
              <span className="text-sm font-normal text-muted-foreground">{done}/{steps.length}</span>
            </CardTitle>
            <Progress value={pct} className="h-2 mt-2" />
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((s) => {
                  const Icon = s.icon;
                  const complete = !!status?.[s.key as keyof typeof status];
                  return (
                    <div key={s.key} className={`flex items-center gap-2 border rounded-lg p-2.5 ${complete ? 'bg-emerald-500/5 border-emerald-500/30' : ''}`}>
                      {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="text-sm truncate">{s.label}</span>
                      {s.optional && <Badge variant="outline" className="text-[9px] ml-auto">opc</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
            {allEssentialDone && (
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-lg p-3">
                <Sparkles className="h-4 w-4" />
                Itens essenciais concluídos — o sistema já pode operar com dados reais.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passo: Contas bancárias */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4" />Conta bancária / carteira
            {status?.accounts && <Badge className="ml-2"><CheckCircle2 className="h-3 w-3 mr-1" />já tem</Badge>}
          </CardTitle></CardHeader>
          <CardContent>
            <FormBody>
              <FormSection description="Banco, agência e conta de onde saem e entram os recebimentos.">
                <FormGrid cols={3}>
                  <FormField label="Código do banco" required>
                    <Input value={bank.bank_code} onChange={(e) => setBank({ ...bank, bank_code: e.target.value })} placeholder="001" />
                  </FormField>
                  <FormField label="Nome do banco" required fullWidth>
                    <Input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} placeholder="Banco do Brasil" />
                  </FormField>
                  <FormField label="Agência" required>
                    <Input value={bank.agency} onChange={(e) => setBank({ ...bank, agency: e.target.value })} placeholder="1234" />
                  </FormField>
                  <FormField label="Conta" required>
                    <Input value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })} placeholder="56789-0" />
                  </FormField>
                  <FormField label="Tipo">
                    <Select value={bank.account_type} onValueChange={(v) => setBank({ ...bank, account_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Conta corrente</SelectItem>
                        <SelectItem value="savings">Poupança</SelectItem>
                        <SelectItem value="payment">Conta pagamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </FormGrid>
              </FormSection>
              <Button disabled={createBank.isPending || !bank.bank_code || !bank.bank_name || !bank.agency || !bank.account_number}
                onClick={() => createBank.mutate(bank, { onSuccess: () => setBank({ bank_code: '', bank_name: '', agency: '', account_number: '', account_type: 'checking' }) })}>
                {createBank.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Cadastrar conta
              </Button>
            </FormBody>
          </CardContent>
        </Card>

        {/* Passo: Clientes e fornecedores */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />Cliente ou fornecedor
            {status?.partners && <Badge className="ml-2"><CheckCircle2 className="h-3 w-3 mr-1" />já tem</Badge>}
          </CardTitle></CardHeader>
          <CardContent>
            <FormBody>
              <FormSection description="As contrapartes dos seus títulos a receber e a pagar.">
                <FormGrid cols={3}>
                  <FormField label="Nome / Razão social" required fullWidth>
                    <Input value={partner.name} onChange={(e) => setPartner({ ...partner, name: e.target.value })} placeholder="Empresa X Ltda" />
                  </FormField>
                  <FormField label="Tipo">
                    <Select value={partner.kind} onValueChange={(v: any) => setPartner({ ...partner, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="fornecedor">Fornecedor</SelectItem>
                        <SelectItem value="ambos">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Pessoa">
                    <Select value={partner.person_type} onValueChange={(v: any) => setPartner({ ...partner, person_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pj">Jurídica</SelectItem>
                        <SelectItem value="pf">Física</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </FormGrid>
              </FormSection>
              <Button disabled={createPartner.isPending || !partner.name}
                onClick={() => createPartner.mutate(partner, { onSuccess: () => setPartner({ name: '', kind: 'cliente', person_type: 'pj' }) })}>
                {createPartner.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Cadastrar contraparte
              </Button>
            </FormBody>
          </CardContent>
        </Card>

        {/* Passo: Centros de custo */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />Centro de custo
            {status?.costCenters && <Badge className="ml-2"><CheckCircle2 className="h-3 w-3 mr-1" />já tem</Badge>}
          </CardTitle></CardHeader>
          <CardContent>
            <FormBody>
              <FormSection description="Para ratear despesas e medir a margem por área ou cliente.">
                <FormGrid cols={3}>
                  <FormField label="Código" required>
                    <Input value={cc.code} onChange={(e) => setCC({ ...cc, code: e.target.value })} placeholder="ADM" />
                  </FormField>
                  <FormField label="Nome" required fullWidth>
                    <Input value={cc.name} onChange={(e) => setCC({ ...cc, name: e.target.value })} placeholder="Administrativo" />
                  </FormField>
                </FormGrid>
              </FormSection>
              <Button disabled={createCC.isPending || !cc.code || !cc.name}
                onClick={() => createCC.mutate(cc, { onSuccess: () => setCC({ code: '', name: '' }) })}>
                {createCC.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Cadastrar centro de custo
              </Button>
            </FormBody>
          </CardContent>
        </Card>

        {/* Passos que ficam em telas próprias */}
        <Card>
          <CardHeader><CardTitle className="text-base">Passos com tela dedicada</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.filter((s) => s.external).map((s) => {
                const Icon = s.icon;
                const complete = !!status?.[s.key as keyof typeof status];
                return (
                  <div key={s.key} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm">{s.label}</span>
                      {s.optional && <Badge variant="outline" className="text-[10px]">opcional</Badge>}
                    </div>
                    <Button size="sm" variant={complete ? 'outline' : 'default'} onClick={() => s.route && navigate(s.route)}>
                      {complete ? 'Revisar' : 'Configurar'}<ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
