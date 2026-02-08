import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Plus, Search, Filter, Download, Users, Briefcase, 
  DollarSign, Clock, Calendar, Mail, Phone, MapPin
} from 'lucide-react';
import { useHCM, EmployeeProfile } from '@/hooks/useHCM';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'react-router-dom';

const statusColors: Record<string, string> = {
  ativo: 'bg-success/10 text-success border-success/20',
  ferias: 'bg-info/10 text-info border-info/20',
  afastado: 'bg-warning/10 text-warning border-warning/20',
  desligado: 'bg-destructive/10 text-destructive border-destructive/20',
  experiencia: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const contractTypeLabels: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  temporario: 'Temporário',
  intermitente: 'Intermitente',
};

const journeyTypeLabels: Record<string, string> = {
  '44h': '44h semanais',
  '36h': '36h semanais',
  '12x36': '12x36',
  flexivel: 'Flexível',
  parcial: 'Parcial',
};

export default function Colaboradores() {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'todos';
  
  const { employees, employeesLoading, createEmployee } = useHCM();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [departmentFilter, setDepartmentFilter] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    registration_number: '',
    cpf: '',
    personal_email: '',
    phone: '',
    contract_type: 'clt' as const,
    journey_type: '44h' as const,
    hire_date: new Date().toISOString().split('T')[0],
    base_salary: 0,
  });

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
      emp.cpf?.includes(search);
    const matchesStatus = statusFilter === 'todos' || emp.status === statusFilter;
    const matchesDepartment = departmentFilter === 'todos' || emp.department_id === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const departments = [...new Set(employees.map(e => e.departamento?.nome).filter(Boolean))];

  const handleSubmit = async () => {
    await createEmployee.mutateAsync(formData);
    setDialogOpen(false);
    setFormData({
      full_name: '',
      registration_number: '',
      cpf: '',
      personal_email: '',
      phone: '',
      contract_type: 'clt',
      journey_type: '44h',
      hire_date: new Date().toISOString().split('T')[0],
      base_salary: 0,
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Colaboradores</h1>
            <p className="text-muted-foreground">
              Cadastro unificado e gestão de contratos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Colaborador</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="dados" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
                    <TabsTrigger value="contrato">Contrato</TabsTrigger>
                    <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="dados" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Nome Completo *</Label>
                        <Input 
                          value={formData.full_name}
                          onChange={e => setFormData({...formData, full_name: e.target.value})}
                          placeholder="Nome completo do colaborador"
                        />
                      </div>
                      <div>
                        <Label>Matrícula</Label>
                        <Input 
                          value={formData.registration_number}
                          onChange={e => setFormData({...formData, registration_number: e.target.value})}
                          placeholder="Matrícula"
                        />
                      </div>
                      <div>
                        <Label>CPF</Label>
                        <Input 
                          value={formData.cpf}
                          onChange={e => setFormData({...formData, cpf: e.target.value})}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div>
                        <Label>E-mail Pessoal</Label>
                        <Input 
                          type="email"
                          value={formData.personal_email}
                          onChange={e => setFormData({...formData, personal_email: e.target.value})}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input 
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="contrato" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Contrato *</Label>
                        <Select 
                          value={formData.contract_type}
                          onValueChange={v => setFormData({...formData, contract_type: v as typeof formData.contract_type})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clt">CLT</SelectItem>
                            <SelectItem value="pj">PJ</SelectItem>
                            <SelectItem value="estagio">Estágio</SelectItem>
                            <SelectItem value="temporario">Temporário</SelectItem>
                            <SelectItem value="intermitente">Intermitente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Jornada *</Label>
                        <Select 
                          value={formData.journey_type}
                          onValueChange={v => setFormData({...formData, journey_type: v as typeof formData.journey_type})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="44h">44h semanais</SelectItem>
                            <SelectItem value="36h">36h semanais</SelectItem>
                            <SelectItem value="12x36">12x36</SelectItem>
                            <SelectItem value="flexivel">Flexível</SelectItem>
                            <SelectItem value="parcial">Parcial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Data de Admissão *</Label>
                        <Input 
                          type="date"
                          value={formData.hire_date}
                          onChange={e => setFormData({...formData, hire_date: e.target.value})}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="financeiro" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Salário Base *</Label>
                        <Input 
                          type="number"
                          value={formData.base_salary}
                          onChange={e => setFormData({...formData, base_salary: parseFloat(e.target.value) || 0})}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={createEmployee.isPending}>
                    {createEmployee.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nome, matrícula ou CPF..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="ferias">Em Férias</SelectItem>
                  <SelectItem value="afastado">Afastados</SelectItem>
                  <SelectItem value="experiencia">Experiência</SelectItem>
                  <SelectItem value="desligado">Desligados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{employees.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-success">
              {employees.filter(e => e.status === 'ativo').length}
            </p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-info">
              {employees.filter(e => e.contract_type === 'clt').length}
            </p>
            <p className="text-sm text-muted-foreground">CLT</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">
              {employees.filter(e => e.contract_type === 'pj').length}
            </p>
            <p className="text-sm text-muted-foreground">PJ</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {employees.filter(e => e.contract_type === 'estagio').length}
            </p>
            <p className="text-sm text-muted-foreground">Estágio</p>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {employeesLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Cargo / Depto</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-right">Custo/Hora</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow 
                      key={emp.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={emp.photo_url || ''} />
                            <AvatarFallback className="text-xs">
                              {getInitials(emp.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{emp.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {emp.registration_number || 'Sem matrícula'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {contractTypeLabels[emp.contract_type]}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {journeyTypeLabels[emp.journey_type]}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{emp.cargo?.nome || '-'}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.departamento?.nome || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {new Date(emp.hire_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(emp.base_salary)}
                      </TableCell>
                      <TableCell className="text-right">
                        {emp.hourly_rate 
                          ? formatCurrency(emp.hourly_rate) 
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[emp.status]}>
                          {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum colaborador encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Employee Detail Dialog */}
        {selectedEmployee && (
          <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedEmployee.photo_url || ''} />
                    <AvatarFallback>
                      {getInitials(selectedEmployee.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{selectedEmployee.full_name}</p>
                    <p className="text-sm font-normal text-muted-foreground">
                      {selectedEmployee.registration_number || 'Sem matrícula'}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="info" className="w-full">
                <TabsList>
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="contrato">Contrato</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEmployee.personal_email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEmployee.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEmployee.cargo?.nome || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEmployee.departamento?.nome || '-'}</span>
                    </div>
                    {selectedEmployee.address_city && (
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {selectedEmployee.address_city}, {selectedEmployee.address_state}
                        </span>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="contrato" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Tipo de Contrato</p>
                      <p className="font-medium">
                        {contractTypeLabels[selectedEmployee.contract_type]}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Jornada</p>
                      <p className="font-medium">
                        {journeyTypeLabels[selectedEmployee.journey_type]}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Admissão</p>
                      <p className="font-medium">
                        {new Date(selectedEmployee.hire_date).toLocaleDateString('pt-BR')}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Centro de Custo</p>
                      <p className="font-medium">
                        {selectedEmployee.cost_center?.name || '-'}
                      </p>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="financeiro" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 bg-success/5 border-success/20">
                      <DollarSign className="h-5 w-5 text-success mb-2" />
                      <p className="text-sm text-muted-foreground">Salário Base</p>
                      <p className="text-xl font-bold text-success">
                        {formatCurrency(selectedEmployee.base_salary)}
                      </p>
                    </Card>
                    <Card className="p-4 bg-info/5 border-info/20">
                      <Clock className="h-5 w-5 text-info mb-2" />
                      <p className="text-sm text-muted-foreground">Custo/Hora</p>
                      <p className="text-xl font-bold text-info">
                        {selectedEmployee.hourly_rate 
                          ? formatCurrency(selectedEmployee.hourly_rate)
                          : 'Calcular'
                        }
                      </p>
                    </Card>
                    <Card className="p-4 bg-purple-500/5 border-purple-500/20">
                      <TrendingUp className="h-5 w-5 text-purple-500 mb-2" />
                      <p className="text-sm text-muted-foreground">% Comissão</p>
                      <p className="text-xl font-bold text-purple-500">
                        {selectedEmployee.commission_rate}%
                      </p>
                    </Card>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    PIX: {selectedEmployee.pix_key || 'Não informado'}
                  </div>
                </TabsContent>

                <TabsContent value="beneficios" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <p className="font-medium">Vale Transporte</p>
                      <p className={selectedEmployee.has_vt ? 'text-success' : 'text-muted-foreground'}>
                        {selectedEmployee.has_vt 
                          ? `${formatCurrency(selectedEmployee.vt_daily_value)}/dia`
                          : 'Não possui'
                        }
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="font-medium">Vale Refeição</p>
                      <p className={selectedEmployee.has_vr ? 'text-success' : 'text-muted-foreground'}>
                        {selectedEmployee.has_vr 
                          ? `${formatCurrency(selectedEmployee.vr_daily_value)}/dia`
                          : 'Não possui'
                        }
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="font-medium">Plano de Saúde</p>
                      <p className={selectedEmployee.has_health_plan ? 'text-success' : 'text-muted-foreground'}>
                        {selectedEmployee.has_health_plan 
                          ? `${formatCurrency(selectedEmployee.health_plan_value)} (${selectedEmployee.health_plan_dependents} dep.)`
                          : 'Não possui'
                        }
                      </p>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}

// Import TrendingUp for the component
import { TrendingUp } from 'lucide-react';
