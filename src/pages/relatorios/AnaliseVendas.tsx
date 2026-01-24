import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { showExportToast } from '@/utils/devFeedback';

const vendasMes = [
  { mes: 'Ago', valor: 125000, quantidade: 450 },
  { mes: 'Set', valor: 142000, quantidade: 520 },
  { mes: 'Out', valor: 138000, quantidade: 485 },
  { mes: 'Nov', valor: 168000, quantidade: 610 },
  { mes: 'Dez', valor: 195000, quantidade: 720 },
  { mes: 'Jan', valor: 156000, quantidade: 580 },
];

const vendasCategoria = [
  { name: 'Eletrônicos', value: 45000, color: '#0085FF' },
  { name: 'Vestuário', value: 32000, color: '#10B981' },
  { name: 'Alimentos', value: 28000, color: '#F59E0B' },
  { name: 'Casa e Decoração', value: 25000, color: '#8B5CF6' },
  { name: 'Outros', value: 26000, color: '#6B7280' },
];

const topProdutos = [
  { produto: 'Smartphone XYZ', quantidade: 145, valor: 72500 },
  { produto: 'Notebook Pro', quantidade: 52, valor: 156000 },
  { produto: 'Fone Bluetooth', quantidade: 320, valor: 32000 },
  { produto: 'Smart TV 55"', quantidade: 28, valor: 84000 },
  { produto: 'Tablet 10"', quantidade: 89, valor: 44500 },
];

export default function AnaliseVendas() {
  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Análise de Vendas"
          description="Dashboard analítico de performance de vendas"
        />

        <div className="flex gap-4 justify-between">
          <div className="flex gap-2">
            <Select defaultValue="6m">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Último Mês</SelectItem>
                <SelectItem value="3m">Últimos 3 Meses</SelectItem>
                <SelectItem value="6m">Últimos 6 Meses</SelectItem>
                <SelectItem value="12m">Último Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => showExportToast('Excel')}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-2xl font-bold">R$ 156k</p>
                  <p className="text-xs text-green-500">+12% vs mês anterior</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Itens Vendidos</p>
                  <p className="text-2xl font-bold">580</p>
                  <p className="text-xs text-red-500">-5% vs mês anterior</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">R$ 269</p>
                  <p className="text-xs text-green-500">+8% vs mês anterior</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                  <p className="text-2xl font-bold">342</p>
                  <p className="text-xs text-green-500">+15 novos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendasMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="valor" name="Faturamento" fill="#0085FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendasCategoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {vendasCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProdutos.map((produto, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{produto.produto}</p>
                      <p className="text-sm text-muted-foreground">{produto.quantidade} unidades vendidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(produto.valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
