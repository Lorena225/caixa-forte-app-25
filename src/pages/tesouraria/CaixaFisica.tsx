import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, DollarSign, MapPin } from 'lucide-react';
import { useCashRegisters, useCashRegisterMovements, useCreateCashRegister, useCreateCashMovement, MovementType } from '@/hooks/useCashRegisters';
import { formatCurrency, formatDate } from '@/lib/formatters';

const movementTypeConfig: Record<MovementType, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; icon: React.ElementType }> = {
  abertura: { label: 'Abertura', variant: 'secondary', icon: RefreshCw },
  entrada: { label: 'Entrada', variant: 'default', icon: ArrowUpCircle },
  saida: { label: 'Saída', variant: 'destructive', icon: ArrowDownCircle },
  sangria: { label: 'Sangria', variant: 'outline', icon: ArrowDownCircle },
  suprimento: { label: 'Suprimento', variant: 'default', icon: ArrowUpCircle },
  fechamento: { label: 'Fechamento', variant: 'secondary', icon: RefreshCw },
};

export default function CaixaFisicaPage() {
  const [activeTab, setActiveTab] = useState('caixas');
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [selectedCashRegister, setSelectedCashRegister] = useState<string>('');
  
  const [registerForm, setRegisterForm] = useState({
    name: '',
    code: '',
    location: '',
    opening_balance: '',
  });

  const [movementForm, setMovementForm] = useState({
    cash_register_id: '',
    movement_type: '' as MovementType | '',
    amount: '',
    description: '',
    payment_method: '',
  });

  const { data: cashRegisters = [], isLoading: loadingRegisters } = useCashRegisters(false);
  const { data: movements = [], isLoading: loadingMovements } = useCashRegisterMovements(
    selectedCashRegister || undefined
  );
  const createRegister = useCreateCashRegister();
  const createMovement = useCreateCashMovement();

  const activeRegisters = cashRegisters.filter(r => r.is_active);
  const totalBalance = activeRegisters.reduce((sum, r) => sum + Number(r.current_balance), 0);

  const handleCreateRegister = async () => {
    if (!registerForm.name) return;

    await createRegister.mutateAsync({
      name: registerForm.name,
      code: registerForm.code || undefined,
      location: registerForm.location || undefined,
      opening_balance: registerForm.opening_balance ? parseFloat(registerForm.opening_balance) : undefined,
    });

    setRegisterForm({ name: '', code: '', location: '', opening_balance: '' });
    setIsRegisterDialogOpen(false);
  };

  const handleCreateMovement = async () => {
    if (!movementForm.cash_register_id || !movementForm.movement_type || !movementForm.amount) return;

    await createMovement.mutateAsync({
      cash_register_id: movementForm.cash_register_id,
      movement_type: movementForm.movement_type as MovementType,
      amount: parseFloat(movementForm.amount),
      description: movementForm.description || undefined,
      payment_method: movementForm.payment_method || undefined,
    });

    setMovementForm({ cash_register_id: '', movement_type: '', amount: '', description: '', payment_method: '' });
    setIsMovementDialogOpen(false);
  };

  const isLoading = loadingRegisters || loadingMovements;

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="Caixa Física"
          description="Gestão de caixas físicos e movimentações"
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Novo Movimento
            </Button>
            <Button onClick={() => setIsRegisterDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Caixa
            </Button>
          </div>
        </PageHeader>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-sm text-muted-foreground">{activeRegisters.length} caixas ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4" />
                Entradas (Hoje)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(
                  movements
                    .filter(m => ['entrada', 'suprimento'].includes(m.movement_type) && 
                      m.movement_date === new Date().toISOString().split('T')[0])
                    .reduce((sum, m) => sum + Number(m.amount), 0)
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4" />
                Saídas (Hoje)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(
                  movements
                    .filter(m => ['saida', 'sangria'].includes(m.movement_type) && 
                      m.movement_date === new Date().toISOString().split('T')[0])
                    .reduce((sum, m) => sum + Number(m.amount), 0)
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="caixas">Caixas Cadastrados</TabsTrigger>
            <TabsTrigger value="movimentos">Movimentações</TabsTrigger>
          </TabsList>

          <TabsContent value="caixas" className="mt-4">
            {loadingRegisters ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : cashRegisters.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum caixa cadastrado</p>
                    <Button className="mt-4" onClick={() => setIsRegisterDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Caixa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cashRegisters.map((register) => (
                  <Card key={register.id} className={!register.is_active ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{register.name}</CardTitle>
                        <Badge variant={register.is_active ? 'default' : 'secondary'}>
                          {register.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      {register.code && (
                        <CardDescription>Código: {register.code}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Saldo Atual</span>
                          <span className={`font-bold ${Number(register.current_balance) >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(register.current_balance)}
                          </span>
                        </div>
                        {register.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {register.location}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Abertura: {formatDate(register.opening_date)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="movimentos" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Histórico de Movimentações</CardTitle>
                  <Select value={selectedCashRegister} onValueChange={setSelectedCashRegister}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos os caixas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os caixas</SelectItem>
                      {cashRegisters.map((register) => (
                        <SelectItem key={register.id} value={register.id}>
                          {register.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMovements ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : movements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma movimentação encontrada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Caixa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Saldo Após</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => {
                        const config = movementTypeConfig[movement.movement_type as MovementType];
                        const Icon = config?.icon || RefreshCw;
                        const isInflow = ['abertura', 'entrada', 'suprimento'].includes(movement.movement_type);
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>
                              <div className="text-sm">
                                <div>{formatDate(movement.movement_date)}</div>
                                <div className="text-muted-foreground">{movement.movement_time?.slice(0, 5)}</div>
                              </div>
                            </TableCell>
                            <TableCell>{movement.cash_register?.name}</TableCell>
                            <TableCell>
                              <Badge variant={config?.variant || 'default'} className="gap-1">
                                <Icon className="h-3 w-3" />
                                {config?.label || movement.movement_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{movement.description || '-'}</TableCell>
                            <TableCell className={`text-right font-medium ${isInflow ? 'text-success' : 'text-destructive'}`}>
                              {isInflow ? '+' : '-'}{formatCurrency(movement.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {movement.balance_after !== null ? formatCurrency(movement.balance_after) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog - Novo Caixa */}
        <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Caixa Físico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Caixa *</Label>
                <Input
                  placeholder="Ex: Caixa 01 - Loja Centro"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    placeholder="CX01"
                    value={registerForm.code}
                    onChange={(e) => setRegisterForm({ ...registerForm, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Saldo Inicial</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={registerForm.opening_balance}
                    onChange={(e) => setRegisterForm({ ...registerForm, opening_balance: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Localização</Label>
                <Input
                  placeholder="Ex: Loja Centro, Matriz"
                  value={registerForm.location}
                  onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRegisterDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRegister} disabled={createRegister.isPending || !registerForm.name}>
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog - Novo Movimento */}
        <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Movimento de Caixa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Caixa *</Label>
                <Select
                  value={movementForm.cash_register_id}
                  onValueChange={(v) => setMovementForm({ ...movementForm, cash_register_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o caixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRegisters.map((register) => (
                      <SelectItem key={register.id} value={register.id}>
                        {register.name} ({formatCurrency(register.current_balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={movementForm.movement_type}
                    onValueChange={(v) => setMovementForm({ ...movementForm, movement_type: v as MovementType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="suprimento">Suprimento</SelectItem>
                      <SelectItem value="sangria">Sangria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={movementForm.amount}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={movementForm.payment_method}
                  onValueChange={(v) => setMovementForm({ ...movementForm, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Descrição do movimento"
                  value={movementForm.description}
                  onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateMovement} 
                disabled={createMovement.isPending || !movementForm.cash_register_id || !movementForm.movement_type || !movementForm.amount}
              >
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
