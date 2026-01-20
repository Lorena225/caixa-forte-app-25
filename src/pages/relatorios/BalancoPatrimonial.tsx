import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Printer } from 'lucide-react';

const ativoCirculante = [
  { conta: 'Caixa e Equivalentes', valor: 125000 },
  { conta: 'Contas a Receber', valor: 89500 },
  { conta: 'Estoques', valor: 156000 },
  { conta: 'Despesas Antecipadas', valor: 12000 },
];

const ativoNaoCirculante = [
  { conta: 'Imobilizado', valor: 450000 },
  { conta: 'Intangível', valor: 85000 },
  { conta: 'Investimentos', valor: 120000 },
];

const passivoCirculante = [
  { conta: 'Fornecedores', valor: 78000 },
  { conta: 'Obrigações Trabalhistas', valor: 45000 },
  { conta: 'Obrigações Tributárias', valor: 32000 },
  { conta: 'Empréstimos CP', valor: 60000 },
];

const passivoNaoCirculante = [
  { conta: 'Empréstimos LP', valor: 280000 },
  { conta: 'Provisões', valor: 45000 },
];

const patrimonioLiquido = [
  { conta: 'Capital Social', valor: 400000 },
  { conta: 'Reservas de Lucros', valor: 85500 },
  { conta: 'Lucros Acumulados', valor: 12000 },
];

export default function BalancoPatrimonial() {
  const totalAtivoCirculante = ativoCirculante.reduce((sum, item) => sum + item.valor, 0);
  const totalAtivoNaoCirculante = ativoNaoCirculante.reduce((sum, item) => sum + item.valor, 0);
  const totalAtivo = totalAtivoCirculante + totalAtivoNaoCirculante;

  const totalPassivoCirculante = passivoCirculante.reduce((sum, item) => sum + item.valor, 0);
  const totalPassivoNaoCirculante = passivoNaoCirculante.reduce((sum, item) => sum + item.valor, 0);
  const totalPatrimonioLiquido = patrimonioLiquido.reduce((sum, item) => sum + item.valor, 0);
  const totalPassivoePL = totalPassivoCirculante + totalPassivoNaoCirculante + totalPatrimonioLiquido;

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Balanço Patrimonial"
          description="Demonstração da posição patrimonial e financeira"
        />

        <div className="flex gap-4 justify-between">
          <div className="flex gap-2">
            <Select defaultValue="2026-01">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-01">Janeiro/2026</SelectItem>
                <SelectItem value="2025-12">Dezembro/2025</SelectItem>
                <SelectItem value="2025-11">Novembro/2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ATIVO */}
          <Card>
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
              <CardTitle className="text-blue-700 dark:text-blue-300">ATIVO</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Ativo Circulante</h4>
                  {ativoCirculante.map((item, index) => (
                    <div key={index} className="flex justify-between py-1 text-sm">
                      <span className="text-muted-foreground">{item.conta}</span>
                      <span>{formatCurrency(item.valor)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-medium border-t mt-2">
                    <span>Total Ativo Circulante</span>
                    <span>{formatCurrency(totalAtivoCirculante)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Ativo Não Circulante</h4>
                  {ativoNaoCirculante.map((item, index) => (
                    <div key={index} className="flex justify-between py-1 text-sm">
                      <span className="text-muted-foreground">{item.conta}</span>
                      <span>{formatCurrency(item.valor)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-medium border-t mt-2">
                    <span>Total Ativo Não Circulante</span>
                    <span>{formatCurrency(totalAtivoNaoCirculante)}</span>
                  </div>
                </div>

                <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-blue-500">
                  <span>TOTAL DO ATIVO</span>
                  <span className="text-blue-600">{formatCurrency(totalAtivo)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PASSIVO + PL */}
          <Card>
            <CardHeader className="bg-green-50 dark:bg-green-900/20">
              <CardTitle className="text-green-700 dark:text-green-300">PASSIVO + PATRIMÔNIO LÍQUIDO</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Passivo Circulante</h4>
                  {passivoCirculante.map((item, index) => (
                    <div key={index} className="flex justify-between py-1 text-sm">
                      <span className="text-muted-foreground">{item.conta}</span>
                      <span>{formatCurrency(item.valor)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-medium border-t mt-2">
                    <span>Total Passivo Circulante</span>
                    <span>{formatCurrency(totalPassivoCirculante)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Passivo Não Circulante</h4>
                  {passivoNaoCirculante.map((item, index) => (
                    <div key={index} className="flex justify-between py-1 text-sm">
                      <span className="text-muted-foreground">{item.conta}</span>
                      <span>{formatCurrency(item.valor)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-medium border-t mt-2">
                    <span>Total Passivo Não Circulante</span>
                    <span>{formatCurrency(totalPassivoNaoCirculante)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Patrimônio Líquido</h4>
                  {patrimonioLiquido.map((item, index) => (
                    <div key={index} className="flex justify-between py-1 text-sm">
                      <span className="text-muted-foreground">{item.conta}</span>
                      <span>{formatCurrency(item.valor)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-medium border-t mt-2">
                    <span>Total Patrimônio Líquido</span>
                    <span>{formatCurrency(totalPatrimonioLiquido)}</span>
                  </div>
                </div>

                <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-green-500">
                  <span>TOTAL PASSIVO + PL</span>
                  <span className="text-green-600">{formatCurrency(totalPassivoePL)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
