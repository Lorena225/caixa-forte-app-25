import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Circle, ArrowRight, Building2, BookOpen, Layers, Landmark, Users, Receipt, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * Onboarding real de ERP — substitui o "Configure seu sistema" raso (que só
 * falava de contas/clientes/fornecedores) por uma trilha de implantação com as
 * etapas que de fato preparam o sistema para operar, com progresso e estado por
 * etapa. Cada passo é guiado e leva direto à tela de cadastro.
 */
export interface OnboardingStatus {
  company?: boolean;       // dados da empresa / regime tributário
  chartOfAccounts?: boolean; // plano de contas
  costCenters?: boolean;   // centros de custo
  accounts?: boolean;      // contas bancárias / carteiras
  partners?: boolean;      // clientes e fornecedores
  taxParams?: boolean;     // parâmetros fiscais
  firstProject?: boolean;  // primeiro projeto
}

interface Step {
  key: keyof OnboardingStatus;
  label: string;
  description: string;
  icon: LucideIcon;
  route: string;
  optional?: boolean;
}

const STEPS: Step[] = [
  { key: 'company', label: 'Dados da empresa', description: 'Razão social, CNPJ e regime tributário', icon: Building2, route: '/configuracoes/empresa' },
  { key: 'chartOfAccounts', label: 'Plano de contas', description: 'Estrutura contábil base', icon: BookOpen, route: '/contabilidade/plano-contas' },
  { key: 'costCenters', label: 'Centros de custo', description: 'Para ratear despesas e medir margem', icon: Layers, route: '/cadastros/centros-custo' },
  { key: 'accounts', label: 'Contas e carteiras', description: 'Bancos, caixa e meios de recebimento', icon: Landmark, route: '/cadastros/contas-bancarias' },
  { key: 'partners', label: 'Clientes e fornecedores', description: 'Contrapartes dos títulos', icon: Users, route: '/cadastros/clientes-fornecedores' },
  { key: 'taxParams', label: 'Parâmetros fiscais', description: 'Alíquotas de ISS, PIS, COFINS, IRPJ e CSLL', icon: Receipt, route: '/fiscal/apuracao' },
  { key: 'firstProject', label: 'Primeiro projeto', description: 'Crie um projeto e defina o orçamento', icon: FolderKanban, route: '/projetos', optional: true },
];

export function OnboardingChecklist({ status }: { status: OnboardingStatus }) {
  const navigate = useNavigate();
  const done = STEPS.filter((s) => status[s.key]).length;
  const total = STEPS.length;
  const pct = Math.round((done / total) * 100);
  const nextStep = STEPS.find((s) => !status[s.key]);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg text-foreground">Configure seu Vitrio</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete a implantação para o sistema operar com seus dados reais.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{pct}%</p>
            <p className="text-xs text-muted-foreground">{done} de {total} etapas</p>
          </div>
        </div>
        <Progress value={pct} className="h-2 mt-3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const complete = !!status[step.key];
            const isNext = nextStep?.key === step.key;
            return (
              <div key={step.key}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                  complete ? 'bg-muted/40 border-border' : isNext ? 'border-primary/40 bg-primary/5' : 'border-border',
                )}>
                <div className={cn('rounded-lg p-2 shrink-0', complete ? 'bg-emerald-500/10' : 'bg-muted')}>
                  {complete
                    ? <Check className="h-4 w-4 text-emerald-600" />
                    : <Icon className={cn('h-4 w-4', isNext ? 'text-primary' : 'text-muted-foreground')} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium flex items-center gap-2', complete && 'text-muted-foreground')}>
                    {step.label}
                    {step.optional && <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1">opcional</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {!complete && (
                  <Button size="sm" variant={isNext ? 'default' : 'outline'} onClick={() => navigate(step.route)} className="shrink-0">
                    {isNext ? 'Começar' : 'Abrir'} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
