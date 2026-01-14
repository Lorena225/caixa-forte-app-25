import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PiggyBank, TrendingUp, Calendar, Building2, 
  Plus, AlertCircle, DollarSign, Percent, Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { 
  useInvestments, 
  useInvestmentsDashboard, 
  useCreateInvestment,
  Investment,
  InvestmentType
} from '@/hooks/useInvestments';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

const INVESTMENT_TYPES: Record<InvestmentType, string> = {
  cdb: 'CDB',
  lci: 'LCI',
  lca: 'LCA',
  tesouro_direto: 'Tesouro Direto',
  fundos: 'Fundos',
  acoes: 'Ações',
  outros: 'Outros',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

export default function Investimentos() {
  const [statusFilter, setStatusFilter] = useState<string>('ativo');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { data: investments = [], isLoading } = useInvestments(statusFilter as any);
  const { data: dashboard } = useInvestmentsDashboard();
  const createInvestment = useCreateInvestment();

  // New investment form state
  const [formData, setFormData] = useState({
    name: '',
    investment_type: 'cdb' as InvestmentType,
    institution: '',
    application_date: new Date().toISOString().split('T')[0],
    maturity_date: '',
    principal_amount: '',
    yield_rate: '',
    yield_type: 'cdi',
  });

  const handleCreateInvestment = () => {
    createInvestment.mutate({
      name: formData.name,
      investment_type: formData.investment_type,
      institution: formData.institution,
      application_date: formData.application_date,
      maturity_date: formData.maturity_date || undefined,
      principal_amount: parseFloat(formData.principal_amount) || 0,
      yield_rate: parseFloat(formData.yield_rate) || undefined,
      yield_type: formData.yield_type as any,
    }, {
      onSuccess: () => {
        setShowNewDialog(false);
        setFormData({
          name: '',
          investment_type: 'cdb',
          institution: '',
          application_date: new Date().toISOString().split('T')[0],
          maturity_date: '',
          principal_amount: '',
          yield_rate: '',
          yield_type: 'cdi',
        });
      },
    });
  };

  const getStatusBadge = (status: Investment['status']) => {
    const styles = {
      ativo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      resgatado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      vencido: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels = {
      ativo: 'Ativo',
      resgatado: 'Resgatado',
      vencido: 'Vencido',
    };
    return (
      <Badge className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const pieData = dashboard?.byType?.map(item => ({
    name: INVESTMENT_TYPES[item.type as InvestmentType] || item.type,
    value: item.value,
  })) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Investimentos"
          description="Gerencie seus investimentos e acompanhe a rentabilidade"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="list">Lista de Investimentos</TabsTrigger>
            <TabsTrigger value="maturity">Vencimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Investido</p>
                      <p className="text-2xl font-bold">{formatCurrency(dashboard?.totalInvested || 0)}</p>
                    </div>
                    <PiggyBank className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Atual</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(dashboard?.totalCurrentValue || 0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rendimento</p>
                      <p className={`text-2xl font-bold ${(dashboard?.totalYield || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(dashboard?.totalYield || 0)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rentabilidade</p>
                      <p className={`text-2xl font-bold ${(dashboard?.yieldPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(dashboard?.yieldPercent || 0).toFixed(2)}%
                      </p>
                    </div>
                    <Percent className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhum investimento cadastrado
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* By Institution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Por Instituição
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard?.byInstitution && dashboard.byInstitution.length > 0 ? (
                    <div className="space-y-3">
                      {dashboard.byInstitution.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="font-medium">{item.institution}</span>
                          <span className="text-lg font-bold">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <div className="flex justify-between items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="resgatado">Resgatados</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Investimento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Novo Investimento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-sm font-medium">Nome</label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: CDB Banco X 120%"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Tipo</label>
                          <Select
                            value={formData.investment_type}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, investment_type: v as InvestmentType }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(INVESTMENT_TYPES).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Instituição</label>
                          <Input
                            value={formData.institution}
                            onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                            placeholder="Nome do banco"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Data Aplicação</label>
                          <Input
                            type="date"
                            value={formData.application_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, application_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Vencimento</label>
                          <Input
                            type="date"
                            value={formData.maturity_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, maturity_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Valor Aplicado (R$)</label>
                          <Input
                            type="number"
                            value={formData.principal_amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, principal_amount: e.target.value }))}
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Taxa (%)</label>
                          <Input
                            type="number"
                            value={formData.yield_rate}
                            onChange={(e) => setFormData(prev => ({ ...prev, yield_rate: e.target.value }))}
                            placeholder="100"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={handleCreateInvestment}
                        disabled={!formData.name || !formData.institution || !formData.principal_amount || createInvestment.isPending}
                      >
                        Salvar Investimento
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : investments.length === 0 ? (
                  <div className="text-center py-12">
                    <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum investimento encontrado</p>
                    <Button className="mt-4" onClick={() => setShowNewDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Investimento
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Instituição</TableHead>
                        <TableHead className="text-right">Valor Aplicado</TableHead>
                        <TableHead className="text-right">Valor Atual</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investments.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.name}</TableCell>
                          <TableCell>{INVESTMENT_TYPES[inv.investment_type]}</TableCell>
                          <TableCell>{inv.institution}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.principal_amount)}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(inv.current_value || inv.principal_amount)}
                          </TableCell>
                          <TableCell>
                            {inv.maturity_date 
                              ? new Date(inv.maturity_date).toLocaleDateString('pt-BR')
                              : '-'
                            }
                          </TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maturity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Próximos Vencimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.upcomingMaturities && dashboard.upcomingMaturities.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.upcomingMaturities.map((inv) => {
                      const daysUntil = inv.maturity_date 
                        ? Math.ceil((new Date(inv.maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : 0;
                      
                      return (
                        <div 
                          key={inv.id} 
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            daysUntil <= 7 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                            daysUntil <= 15 ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
                            'border-gray-200 bg-gray-50 dark:bg-gray-900/20'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{inv.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {inv.institution} • {INVESTMENT_TYPES[inv.investment_type]}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(inv.current_value || inv.principal_amount)}</p>
                            <p className={`text-sm ${daysUntil <= 7 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {inv.maturity_date && new Date(inv.maturity_date).toLocaleDateString('pt-BR')}
                              {daysUntil <= 7 && (
                                <span className="ml-2 inline-flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {daysUntil} dias
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum vencimento próximo (30 dias)</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
