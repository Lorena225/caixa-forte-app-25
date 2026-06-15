import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Loader2, Settings, AlertTriangle, Pencil } from 'lucide-react';
import { useTaxParameters, useSeedTaxParameters, useUpdateTaxParameter, useAssessment, useRunAssessment } from '@/hooks/useFinanceModule';
import { formatCurrency } from '@/lib/formatters';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const taxLabel: Record<string, string> = {
  ISS: 'ISS', PIS: 'PIS', COFINS: 'COFINS', IRPJ: 'IRPJ', CSLL: 'CSLL', INSS: 'INSS', IRRF: 'IRRF', PCC: 'PIS/COFINS/CSLL retido',
};

export default function ApuracaoFiscal() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: params = [] } = useTaxParameters();
  const { data: assessment = [], isLoading } = useAssessment(year, month);
  const seed = useSeedTaxParameters();
  const updateParam = useUpdateTaxParameter();
  const runAssessment = useRunAssessment();
  const [edit, setEdit] = useState<{ id: string; value: string } | null>(null);

  const total = assessment.reduce((s, a) => s + Number(a.saldo_apurado), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Apuração de Impostos"
          description="Cálculo dos tributos sobre a receita real do período — ISS, PIS, COFINS, IRPJ, CSLL">
          <div className="flex items-center gap-2">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <Input type="number" className="w-24 h-9" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            <Button onClick={() => runAssessment.mutate({ year, month })} disabled={runAssessment.isPending || params.length === 0}>
              {runAssessment.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
              Apurar período
            </Button>
          </div>
        </PageHeader>

        {params.length === 0 && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <span>Nenhum parâmetro tributário configurado. Crie os parâmetros padrão de Lucro Presumido (serviços) para começar.</span>
              <Button size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>
                {seed.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Criar parâmetros padrão
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Calculator className="h-4 w-4" />Apuração de {MONTHS[month - 1]}/{year}</span>
            <span className="text-sm font-normal">Total: <span className="font-bold">{formatCurrency(total)}</span></span>
          </CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : assessment.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhuma apuração para este período. Clique em "Apurar período".</p>
              : <div className="space-y-2">{assessment.map((a) => (
                  <div key={a.tipo_imposto} className="flex items-center justify-between border rounded-lg p-3">
                    <div><p className="font-medium">{taxLabel[a.tipo_imposto] ?? a.tipo_imposto}</p>
                      <Badge variant={a.status === 'apurado' ? 'default' : 'secondary'}>{a.status}</Badge></div>
                    <p className="font-mono font-semibold">{formatCurrency(Number(a.saldo_apurado))}</p>
                  </div>
                ))}</div>}
          </CardContent>
        </Card>

        {params.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4" />Alíquotas configuradas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {params.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div><p className="font-medium">{taxLabel[p.tax_type] ?? p.tax_type}
                      {p.is_withholding && <Badge variant="outline" className="ml-2">retenção</Badge>}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.presumption_base ? `base presumida ${p.presumption_base}% · ` : ''}vencimento dia {p.due_day}
                      </p></div>
                    {edit?.id === p.id ? (
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.01" className="w-24 h-8" value={edit.value} onChange={(e) => setEdit({ id: p.id, value: e.target.value })} />
                        <span className="text-sm">%</span>
                        <Button size="sm" onClick={() => updateParam.mutate({ id: p.id, rate: Number(edit.value) }, { onSuccess: () => setEdit(null) })}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>×</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-mono">{Number(p.rate).toFixed(2)}%</span>
                        <Button size="sm" variant="outline" onClick={() => setEdit({ id: p.id, value: String(p.rate) })}><Pencil className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Os valores são calculados sobre a receita real do período (base × alíquota configurada) e servem de apoio à apuração.
            <strong> A conferência e a transmissão das guias devem ser validadas pelo contador responsável</strong> — o sistema apura e prepara, não transmite ao fisco.
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
