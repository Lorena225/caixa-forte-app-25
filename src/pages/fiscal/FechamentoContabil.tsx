import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, Loader2, BookCheck, Scale } from 'lucide-react';
import { useAccountingClosingCheck } from '@/hooks/useFinanceModule';
import { formatCurrency } from '@/lib/formatters';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function FechamentoContabil() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: check, isLoading } = useAccountingClosingCheck(year, month);

  const recon = check?.reconciliation;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Fechamento Contábil"
          description="Conciliação contábil × financeira e checklist de fechamento por competência">
          <div className="flex items-center gap-2">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <Input type="number" className="w-24 h-9" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
        </PageHeader>

        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : !check ? <p className="text-center py-12 text-muted-foreground">Selecione um período.</p>
          : (
            <>
              {/* Conciliação contábil × financeira */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="h-4 w-4" />Conciliação contábil × financeira</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="border rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Baixado no financeiro</p>
                      <p className="font-bold">{formatCurrency(Number(recon?.financial_settled ?? 0))}</p>
                    </div>
                    <div className="border rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Lançado na contabilidade</p>
                      <p className="font-bold">{formatCurrency(Number(recon?.accounting_entries ?? 0))}</p>
                    </div>
                    <div className="border rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Diferença</p>
                      <p className={`font-bold ${Number(recon?.difference ?? 0) === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(Number(recon?.difference ?? 0))}</p>
                    </div>
                  </div>
                  {recon && Number(recon.titles_without_entry) > 0 && (
                    <Alert variant="destructive" className="mt-3"><X className="h-4 w-4" />
                      <AlertDescription>{recon.titles_without_entry} título(s) baixado(s) sem lançamento contábil. Gere os lançamentos antes de fechar.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Checklist */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BookCheck className="h-4 w-4" />Checklist de fechamento</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(check.checks ?? []).map((c: any) => (
                      <div key={c.code} className="flex items-center gap-3 border rounded-lg p-3">
                        {c.ok ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <X className="h-4 w-4 text-red-600 shrink-0" />}
                        <div className="flex-1"><p className="text-sm font-medium">{c.label}</p>
                          <p className="text-xs text-muted-foreground">{c.detail}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    {check.can_close
                      ? <Alert><Check className="h-4 w-4" /><AlertDescription>Período pronto para fechamento contábil. A trava de competência é feita em Financeiro › Fechamento Mensal.</AlertDescription></Alert>
                      : <Alert variant="destructive"><X className="h-4 w-4" /><AlertDescription>Resolva os itens pendentes acima antes de fechar a competência contábil.</AlertDescription></Alert>}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
      </div>
    </MainLayout>
  );
}
