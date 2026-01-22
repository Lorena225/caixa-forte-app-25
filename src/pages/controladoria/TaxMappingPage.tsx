import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  RefreshCw, 
  Download,
  Search,
  Check,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface MapeamentoContabil {
  id: string;
  numeroConta: string;
  nomeConta: string;
  tributario: string;
  icms: boolean;
  irpj: boolean;
  pis: boolean;
  cofins: boolean;
  status: 'ativo' | 'sem_mapeamento' | 'inativo';
}

const mapeamentos: MapeamentoContabil[] = [
  { id: '1', numeroConta: '6101', nomeConta: 'Despesas Pessoal', tributario: 'Base IRPJ', icms: true, irpj: true, pis: true, cofins: true, status: 'ativo' },
  { id: '2', numeroConta: '1010', nomeConta: 'Caixa', tributario: 'Operacional', icms: false, irpj: false, pis: false, cofins: false, status: 'sem_mapeamento' },
  { id: '3', numeroConta: '3101', nomeConta: 'Receita de Vendas', tributario: 'Base ICMS', icms: true, irpj: true, pis: true, cofins: true, status: 'ativo' },
  { id: '4', numeroConta: '4201', nomeConta: 'Custo das Mercadorias', tributario: 'Base PIS/COFINS', icms: true, irpj: false, pis: true, cofins: true, status: 'ativo' },
  { id: '5', numeroConta: '2101', nomeConta: 'Fornecedores', tributario: 'Passivo', icms: false, irpj: false, pis: false, cofins: false, status: 'ativo' },
  { id: '6', numeroConta: '5301', nomeConta: 'Despesas Administrativas', tributario: '-', icms: false, irpj: false, pis: false, cofins: false, status: 'sem_mapeamento' },
];

export default function TaxMappingPage() {
  const [searchConta, setSearchConta] = useState('');
  const [filterTributario, setFilterTributario] = useState<string>('todos');
  const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false);

  const filteredMapeamentos = mapeamentos.filter(m => {
    const matchesSearch = m.numeroConta.includes(searchConta) || m.nomeConta.toLowerCase().includes(searchConta.toLowerCase());
    const matchesTributario = filterTributario === 'todos' || m.tributario === filterTributario;
    const matchesUnmapped = !showOnlyUnmapped || m.status === 'sem_mapeamento';
    return matchesSearch && matchesTributario && matchesUnmapped;
  });

  const handleNovoMapeamento = () => {
    toast.info('Abrindo formulário de novo mapeamento...');
  };

  const handleSincronizar = () => {
    toast.success('Mapeamentos sincronizados com sucesso');
  };

  const handleExportar = () => {
    toast.success('Exportação iniciada - arquivo será baixado em breve');
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Mapeamento Contas → Tributária" />
          <div className="flex gap-2">
            <Button onClick={handleNovoMapeamento} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Mapeamento
            </Button>
            <Button variant="outline" onClick={handleSincronizar} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sincronizar
            </Button>
            <Button variant="outline" onClick={handleExportar} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Por Conta</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por número ou nome..."
                    value={searchConta}
                    onChange={(e) => setSearchConta(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-48">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Por Tributário</label>
                <Select value={filterTributario} onValueChange={setFilterTributario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Base IRPJ">Base IRPJ</SelectItem>
                    <SelectItem value="Base ICMS">Base ICMS</SelectItem>
                    <SelectItem value="Base PIS/COFINS">Base PIS/COFINS</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                    <SelectItem value="Passivo">Passivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Checkbox 
                  id="unmapped" 
                  checked={showOnlyUnmapped}
                  onCheckedChange={(checked) => setShowOnlyUnmapped(checked as boolean)}
                />
                <label htmlFor="unmapped" className="text-sm text-gray-700 cursor-pointer">
                  Apenas não mapeadas
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Mapeamentos */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Número Conta</TableHead>
                  <TableHead>Nome Conta</TableHead>
                  <TableHead>Tributário</TableHead>
                  <TableHead className="text-center w-16">ICMS</TableHead>
                  <TableHead className="text-center w-16">IRPJ</TableHead>
                  <TableHead className="text-center w-16">PIS</TableHead>
                  <TableHead className="text-center w-16">COFINS</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMapeamentos.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-medium">{item.numeroConta}</TableCell>
                    <TableCell>{item.nomeConta}</TableCell>
                    <TableCell>{item.tributario}</TableCell>
                    <TableCell className="text-center">
                      {item.icms ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <span className="text-gray-300">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.irpj ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <span className="text-gray-300">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.pis ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <span className="text-gray-300">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.cofins ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <span className="text-gray-300">-</span>}
                    </TableCell>
                    <TableCell>
                      {item.status === 'ativo' ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ativo</Badge>
                      ) : item.status === 'sem_mapeamento' ? (
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Sem mapeamento
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredMapeamentos.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhum mapeamento encontrado com os filtros aplicados
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
