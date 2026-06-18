import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, type LucideIcon } from 'lucide-react';

interface GuideStep {
  label: string;
  description: string;
  route: string;
  done?: boolean;
}

/**
 * Estado vazio de dashboard que GUIA em vez de só informar ausência.
 * Em um sistema entrando em produção, o dashboard zerado é o primeiro contato —
 * ele deve transformar "não há dados" em "faça isto para começar".
 */
export function DashboardEmptyGuide({
  icon: Icon,
  title,
  subtitle,
  steps,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  steps: GuideStep[];
}) {
  const navigate = useNavigate();
  const firstPending = steps.find((s) => !s.done);

  return (
    <Card className="border-dashed">
      <CardContent className="py-10">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>

          <div className="space-y-2 text-left">
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => navigate(step.route)}
                className="w-full flex items-center gap-3 border rounded-lg p-3 hover:bg-muted/40 transition-colors text-left">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium shrink-0 ${step.done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${step.done ? 'line-through text-muted-foreground' : ''}`}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>

          {firstPending && (
            <Button className="mt-6" onClick={() => navigate(firstPending.route)}>
              <Sparkles className="h-4 w-4 mr-1" />
              Começar: {firstPending.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
