import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Plus, ArrowRight, Search, Check, AlertTriangle, 
  RefreshCw, Download, Lightbulb, Link2, Settings2
} from 'lucide-react';
import { toast } from 'sonner';

interface AccountingMapping {
  id: string;
  financialCategoryCode: string;
  financialCategoryName: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  mappingType: 'receita' | 'despesa' | 'ativo' | 'passivo';
  isActive: boolean;
}

// Mock data - Mapeamento De-Para
const mockMappings: AccountingMapping[] = [
  { 
    id: '1', 
    financialCategoryCode: 'REC-001', 
    financialCategoryName: 'Vendas de Produtos', 
    debitAccountCode: '1.1.1.01', 
    debitAccountName: 'Caixa/Bancos',
    creditAccountCode: '3.1.1.01',
    creditAccountName: 'Receita de Vendas',
    mappingType: 'receita',
    isActive: true
  },
  { 
    id: '2', 
    financialCategoryCode: 'REC-002', 
    financialCategoryName: 'Prestação de Serviços', 
    debitAccountCode: '1.1.1.01', 
    debitAccountName: 'Caixa/Bancos',
    creditAccountCode: '3.1.2.01',
    creditAccountName: 'Receita de Serviços',
    mappingType: 'receita',
    isActive: true
  },
  { 
    id: '3', 
    financialCategoryCode: 'DESP-001', 
    financialCategoryName: 'Combustível', 
    debitAccountCode: '4.1.3.05', 
    debitAccountName: 'Despesas com Veículos',
    creditAccountCode: '1.1.1.01',
    creditAccountName: 'Caixa/Bancos',
    mappingType: 'despesa',
    isActive: true
  },
  { 
    id: '4', 
    financialCategoryCode: 'DESP-002', 
    financialCategoryName: 'Material de Escritório', 
    debitAccountCode: '4.1.2.01', 
    debitAccountName: 'Despesas Administrativas',
    creditAccountCode: '1.1.1.01',
    creditAccountName: 'Caixa/Bancos',
    mappingType: 'despesa',
    isActive: true
  },
  { 
    id: '5', 
    financialCategoryCode: 'DESP-003', 
    financialCategoryName: 'Folha de Pagamento', 
    debitAccountCode: '4.1.1.01', 
    debitAccountName: 'Despesas com Pessoal',
    creditAccountCode: '2.1.1.02',
    creditAccountName: 'Salários a Pagar',
    mappingType: 'despesa',
    isActive: true
  },
  { 
    id: '6', 
    financialCategoryCode: 'DESP-004', 
    financialCategoryName: 'Aluguel', 
    debitAccountCode: '',
    debitAccountName: '',
    creditAccountCode: '',
    creditAccountName: '',
    mappingType: 'despesa',
    isActive: false
  },
];

const mappingTypeLabels: Record<string, { label: string; color: string }> = {
  receita: { label: 'Receita', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  despesa: { label: 'Despesa', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  ativo: { label: 'Ativo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  passivo: { label: 'Passivo', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
};

export default function MapeamentoContabil() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<AccountingMapping | null>(null);
  const [mappings, setMappings] = useState(mockMappings);

  const filteredMappings = mappings.filter(m => {
    const matchesSearch = 
      m.financialCategoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.financialCategoryCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || m.mappingType === filterType;
    const matchesUnmapped = !showUnmapped || !m.isActive;
    return matchesSearch && matchesType && matchesUnmapped;
  });

  const unmappedCount = mappings.filter(m => !m.isActive).length;
  const mappedCount = mappings.filter(m => m.isActive).length;

  const handleNewMapping = () => {
    setSelectedMapping(null);
    setMappingModalOpen(true);
  };

  const handleEditMapping = (mapping: AccountingMapping) => {
    setSelectedMapping(mapping);
    setMappingModalOpen(true);
  };

  const handleSaveMapping = () => {
    toast.success('Mapeamento salvo com sucesso');
    setMappingModalOpen(false);
  };

  const handleAutoMap = () => {
    toast.info('Sugestão automática em andamento...', { duration: 2000 });
    setTimeout(() => {
      toast.success('3 mapeamentos sugeridos com base no histórico');
    }, 2000);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Mapeamento Contábil (De-Para)"
          description="Vincule categorias financeiras às contas contábeis para automação da DRE"
        />

        {/* Info Alert */}
        <Alert className="bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800">
          <Lightbulb className="h-4 w-4 text-sky-600" />
          <AlertTitle className="text-sky-800 dark:text-sky-300">Contabilidade Automática</AlertTitle>
          <AlertDescription className="text-sky-700 dark:text-sky-400">
            Ao vincular uma <strong>Categoria Financeira</strong> (ex: Combustível) a uma <strong>Conta Contábil</strong> (ex: 4.1.3.05 - Despesas com Veículos), 
            o sistema gera automaticamente os lançamentos contábeis em partida dobrada. 
            Isso elimina lançamentos manuais duplicados e mantém a DRE sempre atualizada.
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Mapeadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{mappedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">categorias vinculadas</p>
            </CardContent>
          </Card>
          <Card className={unmappedCount > 0 ? 'border-orange-200 dark:border-orange-800' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Sem Mapeamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{unmappedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">requerem configuração</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Cobertura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round((mappedCount / mappings.length) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">do plano financeiro</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria financeira..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="passivo">Passivos</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant={showUnmapped ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setShowUnmapped(!showUnmapped)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Não Mapeadas ({unmappedCount})
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAutoMap}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sugerir Automático
            </Button>
            <Button onClick={handleNewMapping}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Mapeamento
            </Button>
          </div>
        </div>

        {/* Mapping Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria Financeira</TableHead>
                  <TableHead className="text-center">
                    <Link2 className="h-4 w-4 mx-auto" />
                  </TableHead>
                  <TableHead>Conta Débito</TableHead>
                  <TableHead>Conta Crédito</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.map((mapping) => (
                  <TableRow 
                    key={mapping.id} 
                    className={!mapping.isActive ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}
                  >
                    <TableCell>
                      <Badge className={mappingTypeLabels[mapping.mappingType]?.color}>
                        {mappingTypeLabels[mapping.mappingType]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mapping.financialCategoryName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {mapping.financialCategoryCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className={`h-4 w-4 mx-auto ${mapping.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </TableCell>
                    <TableCell>
                      {mapping.debitAccountCode ? (
                        <div>
                          <div className="font-mono text-sm">{mapping.debitAccountCode}</div>
                          <div className="text-xs text-muted-foreground">{mapping.debitAccountName}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Não configurado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapping.creditAccountCode ? (
                        <div>
                          <div className="font-mono text-sm">{mapping.creditAccountCode}</div>
                          <div className="text-xs text-muted-foreground">{mapping.creditAccountName}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Não configurado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapping.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <Check className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditMapping(mapping)}
                      >
                        Configurar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mapping Modal */}
        <Dialog open={mappingModalOpen} onOpenChange={setMappingModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {selectedMapping ? 'Editar Mapeamento' : 'Novo Mapeamento Contábil'}
              </DialogTitle>
              <DialogDescription>
                Vincule uma categoria financeira às contas contábeis de débito e crédito
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Categoria Financeira */}
              <div className="space-y-2">
                <Label>Categoria Financeira</Label>
                <Select defaultValue={selectedMapping?.financialCategoryCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REC-001">Vendas de Produtos</SelectItem>
                    <SelectItem value="REC-002">Prestação de Serviços</SelectItem>
                    <SelectItem value="DESP-001">Combustível</SelectItem>
                    <SelectItem value="DESP-002">Material de Escritório</SelectItem>
                    <SelectItem value="DESP-003">Folha de Pagamento</SelectItem>
                    <SelectItem value="DESP-004">Aluguel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo de Operação</Label>
                <Select defaultValue={selectedMapping?.mappingType || 'despesa'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita (Crédito na Receita)</SelectItem>
                    <SelectItem value="despesa">Despesa (Débito na Despesa)</SelectItem>
                    <SelectItem value="ativo">Ativo (Débito no Ativo)</SelectItem>
                    <SelectItem value="passivo">Passivo (Crédito no Passivo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conta Débito */}
              <div className="space-y-2">
                <Label>Conta Contábil de Débito</Label>
                <Select defaultValue={selectedMapping?.debitAccountCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.1.1.01">1.1.1.01 - Caixa/Bancos</SelectItem>
                    <SelectItem value="4.1.1.01">4.1.1.01 - Despesas com Pessoal</SelectItem>
                    <SelectItem value="4.1.2.01">4.1.2.01 - Despesas Administrativas</SelectItem>
                    <SelectItem value="4.1.3.05">4.1.3.05 - Despesas com Veículos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conta Crédito */}
              <div className="space-y-2">
                <Label>Conta Contábil de Crédito</Label>
                <Select defaultValue={selectedMapping?.creditAccountCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.1.1.01">1.1.1.01 - Caixa/Bancos</SelectItem>
                    <SelectItem value="2.1.1.02">2.1.1.02 - Salários a Pagar</SelectItem>
                    <SelectItem value="3.1.1.01">3.1.1.01 - Receita de Vendas</SelectItem>
                    <SelectItem value="3.1.2.01">3.1.2.01 - Receita de Serviços</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMappingModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveMapping}>
                Salvar Mapeamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
