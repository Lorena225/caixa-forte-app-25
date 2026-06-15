import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, Settings2, FileText, MapPin, Package, Percent, 
  Save, Trash2, Edit, Check, AlertTriangle, Lightbulb,
  ArrowRight, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FiscalRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  conditionStateOrigin: string;
  conditionStateDestination: string;
  conditionNcm: string;
  cfop: string;
  icmsRate: number;
  pisRate: number;
  cofinsRate: number;
}

interface NaturezaOperacao {
  id: string;
  code: string;
  name: string;
  type: 'entrada' | 'saida';
  cfopDefault: string;
  isActive: boolean;
}

// Mock data
const mockRules: FiscalRule[] = [
  { id: '1', name: 'Venda Interestadual SP → RJ', priority: 1, isActive: true, conditionStateOrigin: 'SP', conditionStateDestination: 'RJ', conditionNcm: '*', cfop: '6102', icmsRate: 12, pisRate: 1.65, cofinsRate: 7.6 },
  { id: '2', name: 'Venda Interna SP', priority: 2, isActive: true, conditionStateOrigin: 'SP', conditionStateDestination: 'SP', conditionNcm: '*', cfop: '5102', icmsRate: 18, pisRate: 1.65, cofinsRate: 7.6 },
  { id: '3', name: 'Venda Eletrônicos → Norte', priority: 3, isActive: true, conditionStateOrigin: 'SP', conditionStateDestination: 'AM', conditionNcm: '8471*', cfop: '6102', icmsRate: 7, pisRate: 1.65, cofinsRate: 7.6 },
];

const mockNaturezas: NaturezaOperacao[] = [
  { id: '1', code: '5102', name: 'Venda de mercadoria adquirida de terceiros', type: 'saida', cfopDefault: '5102', isActive: true },
  { id: '2', code: '5101', name: 'Venda de produção do estabelecimento', type: 'saida', cfopDefault: '5101', isActive: true },
  { id: '3', code: '1102', name: 'Compra para comercialização', type: 'entrada', cfopDefault: '1102', isActive: true },
  { id: '4', code: '2102', name: 'Compra para comercialização interestadual', type: 'entrada', cfopDefault: '2102', isActive: true },
];

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

export default function MotorTributario() {
  const [activeTab, setActiveTab] = useState('regras');
  const [rules, setRules] = useState(mockRules);
  const [naturezas, setNaturezas] = useState(mockNaturezas);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<FiscalRule | null>(null);

  const handleNewRule = () => {
    setSelectedRule(null);
    setRuleModalOpen(true);
  };

  const handleEditRule = (rule: FiscalRule) => {
    setSelectedRule(rule);
    setRuleModalOpen(true);
  };

  const handleSaveRule = () => {
    toast.success('Regra fiscal salva com sucesso');
    setRuleModalOpen(false);
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    ));
    toast.success('Status da regra atualizado');
  };

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="Motor Tributário"
          description="Configure regras fiscais automáticas e naturezas de operação"
        />

        <Alert className="bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800">
          <Lightbulb className="h-4 w-4 text-sky-600" />
          <AlertTitle className="text-sky-800 dark:text-sky-300">Como funciona?</AlertTitle>
          <AlertDescription className="text-sky-700 dark:text-sky-400">
            O Motor Tributário aplica regras fiscais automaticamente. Crie condições como: 
            <strong> "Se cliente é de SP e produto NCM 8471*, então CFOP = 5102 e ICMS = 18%"</strong>.
            As regras são avaliadas por prioridade (menor número = maior prioridade).
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="regras" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Regras Fiscais
            </TabsTrigger>
            <TabsTrigger value="naturezas" className="gap-2">
              <FileText className="h-4 w-4" />
              Natureza de Operação
            </TabsTrigger>
            <TabsTrigger value="aliquotas" className="gap-2">
              <Percent className="h-4 w-4" />
              Tabela de Alíquotas
            </TabsTrigger>
          </TabsList>

          {/* REGRAS FISCAIS */}
          <TabsContent value="regras" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Defina regras condicionais para cálculo automático de impostos
              </p>
              <Button onClick={handleNewRule}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Prio</TableHead>
                      <TableHead>Regra</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead>CFOP</TableHead>
                      <TableHead>ICMS</TableHead>
                      <TableHead>PIS/COFINS</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id} className={!rule.isActive ? 'opacity-50' : ''}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {rule.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Badge variant="secondary">{rule.conditionStateOrigin}</Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="secondary">{rule.conditionStateDestination}</Badge>
                            {rule.conditionNcm !== '*' && (
                              <>
                                <span className="text-muted-foreground mx-1">•</span>
                                <span className="font-mono text-xs">{rule.conditionNcm}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{rule.cfop}</TableCell>
                        <TableCell>{rule.icmsRate}%</TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {rule.pisRate}% / {rule.cofinsRate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={rule.isActive}
                            onCheckedChange={() => handleToggleRule(rule.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEditRule(rule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NATUREZA DE OPERAÇÃO */}
          <TabsContent value="naturezas" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Configure as naturezas de operação (CFOP) para suas notas fiscais
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Natureza
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Saídas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">Saída</Badge>
                    Vendas e Transferências
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {naturezas.filter(n => n.type === 'saida').map((nat) => (
                    <div 
                      key={nat.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-primary">{nat.code}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{nat.name}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Entradas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">Entrada</Badge>
                    Compras e Devoluções
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {naturezas.filter(n => n.type === 'entrada').map((nat) => (
                    <div 
                      key={nat.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-primary">{nat.code}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{nat.name}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TABELA DE ALÍQUOTAS */}
          <TabsContent value="aliquotas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alíquotas Interestaduais de ICMS</CardTitle>
                <CardDescription>
                  Tabela padrão conforme Resolução do Senado Federal nº 22/89
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem ↓ / Destino →</TableHead>
                        {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'Outros'].map(uf => (
                          <TableHead key={uf} className="text-center font-mono">{uf}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { uf: 'SP', rates: [18, 12, 12, 12, 12, 12, 7] },
                        { uf: 'RJ', rates: [12, 20, 12, 12, 12, 12, 7] },
                        { uf: 'MG', rates: [12, 12, 18, 12, 12, 12, 7] },
                        { uf: 'PR', rates: [12, 12, 12, 18, 12, 12, 7] },
                        { uf: 'SC', rates: [12, 12, 12, 12, 17, 12, 7] },
                        { uf: 'RS', rates: [12, 12, 12, 12, 12, 18, 7] },
                      ].map(row => (
                        <TableRow key={row.uf}>
                          <TableCell className="font-mono font-medium">{row.uf}</TableCell>
                          {row.rates.map((rate, idx) => (
                            <TableCell 
                              key={idx} 
                              className={`text-center font-mono ${
                                rate === 18 || rate === 20 || rate === 17 
                                  ? 'bg-primary/10 font-medium' 
                                  : ''
                              }`}
                            >
                              {rate}%
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Regra Fiscal */}
        <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedRule ? 'Editar Regra Fiscal' : 'Nova Regra Fiscal'}
              </DialogTitle>
              <DialogDescription>
                Configure as condições e resultados da regra tributária
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Identificação */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Regra</Label>
                  <Input 
                    placeholder="Ex: Venda Interestadual SP → RJ" 
                    defaultValue={selectedRule?.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Input 
                    type="number" 
                    placeholder="1" 
                    defaultValue={selectedRule?.priority || 1}
                  />
                  <p className="text-xs text-muted-foreground">Menor = maior prioridade</p>
                </div>
              </div>

              <Separator />

              {/* Condições */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Condições (SE...)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Estado Origem</Label>
                    <Select defaultValue={selectedRule?.conditionStateOrigin || 'SP'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">Qualquer</SelectItem>
                        {brazilianStates.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado Destino</Label>
                    <Select defaultValue={selectedRule?.conditionStateDestination || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">Qualquer</SelectItem>
                        {brazilianStates.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>NCM (Produto)</Label>
                    <Input 
                      placeholder="Ex: 8471* ou *" 
                      defaultValue={selectedRule?.conditionNcm || '*'}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Resultados */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Resultado (ENTÃO...)
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>CFOP</Label>
                    <Input 
                      placeholder="5102" 
                      defaultValue={selectedRule?.cfop}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ICMS %</Label>
                    <Input 
                      type="number" 
                      placeholder="18" 
                      defaultValue={selectedRule?.icmsRate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PIS %</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="1.65" 
                      defaultValue={selectedRule?.pisRate || 1.65}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>COFINS %</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="7.60" 
                      defaultValue={selectedRule?.cofinsRate || 7.6}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRuleModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveRule}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Regra
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
