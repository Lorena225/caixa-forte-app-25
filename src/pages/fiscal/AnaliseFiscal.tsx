import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileDown, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const impostosMes = [
  { mes: 'Ago', icms: 45000, pis: 8500, cofins: 39000, ipi: 12000 },
  { mes: 'Set', icms: 52000, pis: 9200, cofins: 42000, ipi: 14500 },
  { mes: 'Out', icms: 48000, pis: 8800, cofins: 40000, ipi: 13200 },
  { mes: 'Nov', icms: 61000, pis: 10500, cofins: 48000, ipi: 16800 },
  { mes: 'Dez', icms: 72000, pis: 12800, cofins: 58000, ipi: 19500 },
  { mes: 'Jan', icms: 55000, pis: 9800, cofins: 44000, ipi: 15000 },
];

const distribuicaoImpostos = [
  { name: 'ICMS', value: 55000, color: '#0085FF' },
  { name: 'COFINS', value: 44000, color: '#10B981' },
  { name: 'IPI', value: 15000, color: '#F59E0B' },
  { name: 'PIS', value: 9800, color: '#8B5CF6' },
];

const alertas = [
  { tipo: 'warning', mensagem: 'Crédito de ICMS próximo do vencimento (R$ 12.500)', data: '2026-01-25' },
  { tipo: 'info', mensagem: 'Antecipação de ICMS ST vencendo em 5 dias', data: '2026-01-25' },
  { tipo: 'success', mensagem: 'Apuração de PIS/COFINS concluída com sucesso', data: '2026-01-18' },
];

export default function AnaliseFiscal() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Análise Fiscal"
          description="Visão consolidada e análise de tributos"
        />

        <div className="flex gap-4 justify-between">
          <Select defaultValue="2026">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Impostos (Mês)</p>
                  <p className="text-2xl font-bold">R$ 123.8k</p>
                </div>
                <TrendingUp className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xs text-red-500 mt-2">+8.5% vs mês anterior</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Créditos Acumulados</p>
                  <p className="text-2xl font-bold">R$ 45.2k</p>
                </div>
                <TrendingDown className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-green-500 mt-2">Disponível para compensação</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Obrigações Pendentes</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-xs text-yellow-500 mt-2">Verificar prazos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conformidade</p>
                  <p className="text-2xl font-bold">98%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-green-500 mt-2">Excelente</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Impostos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={impostosMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                    <Bar dataKey="icms" name="ICMS" fill="#0085FF" />
                    <Bar dataKey="cofins" name="COFINS" fill="#10B981" />
                    <Bar dataKey="ipi" name="IPI" fill="#F59E0B" />
                    <Bar dataKey="pis" name="PIS" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Imposto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribuicaoImpostos}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {distribuicaoImpostos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alertas e Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertas.map((alerta, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  {alerta.tipo === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                  {alerta.tipo === 'info' && <AlertTriangle className="h-5 w-5 text-blue-500" />}
                  {alerta.tipo === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  <div className="flex-1">
                    <p className="text-sm">{alerta.mensagem}</p>
                  </div>
                  <Badge variant="outline">{new Date(alerta.data).toLocaleDateString('pt-BR')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
