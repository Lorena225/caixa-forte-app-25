import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, TrendingDown, Truck, Package, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const comprasMes = [
  { mes: 'Ago', valor: 85000 },
  { mes: 'Set', valor: 92000 },
  { mes: 'Out', valor: 78000 },
  { mes: 'Nov', valor: 105000 },
  { mes: 'Dez', valor: 125000 },
  { mes: 'Jan', valor: 98000 },
];

const comprasFornecedor = [
  { name: 'Fornecedor Alpha', value: 45000, color: '#0085FF' },
  { name: 'Distribuidora Beta', value: 28000, color: '#10B981' },
  { name: 'Atacado Gamma', value: 15000, color: '#F59E0B' },
  { name: 'Industrial Delta', value: 10000, color: '#8B5CF6' },
];

const topFornecedores = [
  { fornecedor: 'Fornecedor Alpha Ltda', pedidos: 45, valor: 145000, prazoMedio: '28 dias' },
  { fornecedor: 'Distribuidora Beta SA', pedidos: 32, valor: 98000, prazoMedio: '14 dias' },
  { fornecedor: 'Atacado Gamma', pedidos: 28, valor: 65000, prazoMedio: '7 dias' },
  { fornecedor: 'Industrial Delta ME', pedidos: 18, valor: 42000, prazoMedio: '30 dias' },
  { fornecedor: 'Comércio Epsilon', pedidos: 15, valor: 28000, prazoMedio: '21 dias' },
];

export default function AnaliseCompras() {
  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Análise de Compras"
          description="Dashboard analítico de compras e fornecedores"
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
          <Button variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Compras</p>
                  <p className="text-2xl font-bold">R$ 98k</p>
                  <p className="text-xs text-red-500">-22% vs mês anterior</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedores</p>
                  <p className="text-2xl font-bold">28</p>
                  <p className="text-xs text-green-500">+3 novos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-bold">138</p>
                  <p className="text-xs text-muted-foreground">este mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prazo Médio</p>
                  <p className="text-2xl font-bold">21 dias</p>
                  <p className="text-xs text-green-500">-3 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Compras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comprasMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="valor" name="Compras" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compras por Fornecedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={comprasFornecedor}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    >
                      {comprasFornecedor.map((entry, index) => (
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
            <CardTitle>Top 5 Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topFornecedores.map((fornecedor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{fornecedor.fornecedor}</p>
                      <p className="text-sm text-muted-foreground">{fornecedor.pedidos} pedidos | Prazo médio: {fornecedor.prazoMedio}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(fornecedor.valor)}</p>
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
