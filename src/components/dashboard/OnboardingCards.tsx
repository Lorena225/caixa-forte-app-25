import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Users, 
  CreditCard, 
  Wallet, 
  BarChart3, 
  Plug,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  completed: boolean;
}

interface ModuleOnboarding {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  steps: OnboardingStep[];
}

// Simulated onboarding data - in production this would come from the database
const onboardingModules: ModuleOnboarding[] = [
  {
    key: 'produtos',
    title: 'Produtos',
    description: 'Configure seu catálogo de produtos',
    icon: Package,
    color: 'bg-blue-500',
    steps: [
      { key: 'criar-produto', label: 'Criar primeiro produto', description: 'Adicione seu primeiro produto ao catálogo', icon: Package, route: '/cadastros/produtos', completed: false },
      { key: 'categorias', label: 'Configurar categorias', description: 'Organize seus produtos em categorias', icon: Package, route: '/cadastros/dimensoes', completed: false },
    ]
  },
  {
    key: 'clientes',
    title: 'Clientes',
    description: 'Gerencie sua base de clientes',
    icon: Users,
    color: 'bg-green-500',
    steps: [
      { key: 'criar-cliente', label: 'Cadastrar cliente', description: 'Adicione seu primeiro cliente', icon: Users, route: '/cadastros/clientes-fornecedores', completed: false },
    ]
  },
  {
    key: 'vendas',
    title: 'Vendas',
    description: 'Realize sua primeira venda',
    icon: CreditCard,
    color: 'bg-purple-500',
    steps: [
      { key: 'primeira-venda', label: 'Primeira venda', description: 'Registre sua primeira venda no sistema', icon: CreditCard, route: '/vendas/nova', completed: false },
    ]
  },
  {
    key: 'financeiro',
    title: 'Financeiro',
    description: 'Configure suas contas financeiras',
    icon: Wallet,
    color: 'bg-amber-500',
    steps: [
      { key: 'conta-bancaria', label: 'Conta bancária', description: 'Cadastre sua conta bancária', icon: Wallet, route: '/cadastros/contas-bancarias', completed: false },
      { key: 'plano-contas', label: 'Plano de contas', description: 'Configure seu plano de contas', icon: BarChart3, route: '/cadastros/plano-contas', completed: false },
    ]
  },
  {
    key: 'integracoes',
    title: 'Integrações',
    description: 'Conecte com outros sistemas',
    icon: Plug,
    color: 'bg-pink-500',
    steps: [
      { key: 'conectar', label: 'Primeira integração', description: 'Conecte com seu primeiro sistema externo', icon: Plug, route: '/integracoes/conexoes', completed: false },
    ]
  },
];

const OnboardingCard = memo(function OnboardingCard({ module }: { module: ModuleOnboarding }) {
  const navigate = useNavigate();
  const completedSteps = module.steps.filter(s => s.completed).length;
  const totalSteps = module.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const nextStep = module.steps.find(s => !s.completed);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', module.color)}>
            <module.icon className="h-6 w-6 text-white" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {completedSteps}/{totalSteps}
          </span>
        </div>
        <CardTitle className="mt-4 text-lg">{module.title}</CardTitle>
        <CardDescription>{module.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {progress === 100 ? 'Completo!' : `${Math.round(progress)}% concluído`}
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {module.steps.map((step) => (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-3 rounded-lg p-2 text-sm',
                step.completed ? 'text-muted-foreground' : 'text-foreground'
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={cn(step.completed && 'line-through')}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Next Action */}
        {nextStep && (
          <Button
            onClick={() => navigate(nextStep.route)}
            className="w-full gap-2"
            variant="outline"
          >
            {nextStep.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

export const OnboardingCards = memo(function OnboardingCards() {
  const totalSteps = onboardingModules.reduce((acc, m) => acc + m.steps.length, 0);
  const completedSteps = onboardingModules.reduce((acc, m) => acc + m.steps.filter(s => s.completed).length, 0);
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overall Progress Header */}
      <Card className="border-[#0085FF]/20 bg-gradient-to-r from-[#0085FF]/5 to-transparent">
        <CardContent className="flex items-center gap-6 py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0085FF]">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Bem-vindo ao Vitrio!</h2>
            <p className="text-muted-foreground">Complete os passos abaixo para configurar seu sistema.</p>
            <div className="mt-3 flex items-center gap-4">
              <Progress value={overallProgress} className="h-3 flex-1 max-w-xs" />
              <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {onboardingModules.map((module) => (
          <OnboardingCard key={module.key} module={module} />
        ))}
      </div>
    </div>
  );
});

export default OnboardingCards;
