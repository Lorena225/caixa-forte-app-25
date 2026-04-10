import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWallets } from '@/hooks/useCompanyData';
import { Settings, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface MatchRule {
  id: string;
  name: string;
  priority: number;
  criteria: {
    exactAmount: boolean;
    dateRange: number; // dias
    documentMatch: boolean;
    keywordMatch: boolean;
    keywords: string[];
  };
  autoSettle: boolean;
}

const defaultRules: MatchRule[] = [
  {
    id: '1',
    name: 'Valor Exato + Data',
    priority: 1,
    criteria: {
      exactAmount: true,
      dateRange: 3,
      documentMatch: false,
      keywordMatch: false,
      keywords: [],
    },
    autoSettle: true,
  },
  {
    id: '2',
    name: 'Documento + Valor',
    priority: 2,
    criteria: {
      exactAmount: true,
      dateRange: 7,
      documentMatch: true,
      keywordMatch: false,
      keywords: [],
    },
    autoSettle: false,
  },
];

export default function ReconciliationConfig() {
  const { data: wallets = [] } = useWallets();
  const [rules, setRules] = useState<MatchRule[]>(defaultRules);
  const [autoSettleEnabled, setAutoSettleEnabled] = useState(false);
  const [defaultDateTolerance, setDefaultDateTolerance] = useState(3);
  const [requireConfirmation, setRequireConfirmation] = useState(true);

  const bankWallets = wallets.filter((w) => w.type === 'banco');

  const handleSaveConfig = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  const handleAddRule = () => {
    const newRule: MatchRule = {
      id: Date.now().toString(),
      name: `Nova Regra ${rules.length + 1}`,
      priority: rules.length + 1,
      criteria: {
        exactAmount: true,
        dateRange: 5,
        documentMatch: false,
        keywordMatch: false,
        keywords: [],
      },
      autoSettle: false,
    };
    setRules([...rules, newRule]);
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Defina o comportamento padrão do motor de conciliação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Baixa Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Baixar títulos automaticamente quando match 100%
                  </p>
                </div>
                <Switch
                  checked={autoSettleEnabled}
                  onCheckedChange={setAutoSettleEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir Confirmação</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar sugestões antes de baixar (modo semi-automático)
                  </p>
                </div>
                <Switch
                  checked={requireConfirmation}
                  onCheckedChange={setRequireConfirmation}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tolerância de Data Padrão (dias)</Label>
                <Select
                  value={defaultDateTolerance.toString()}
                  onValueChange={(v) => setDefaultDateTolerance(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">± 1 dia</SelectItem>
                    <SelectItem value="3">± 3 dias</SelectItem>
                    <SelectItem value="5">± 5 dias</SelectItem>
                    <SelectItem value="7">± 7 dias</SelectItem>
                    <SelectItem value="15">± 15 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Contas Bancárias Configuradas</CardTitle>
          <CardDescription>
            Contas vinculadas para importação de extratos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bankWallets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankWallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-medium">{wallet.name}</TableCell>
                    <TableCell>{wallet.bank_id || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">OFX/CSV</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Ativa
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma conta bancária cadastrada.</p>
              <Button variant="link" asChild>
                <a href="/cadastros/carteiras">Cadastrar conta bancária</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Regras de Conciliação</CardTitle>
              <CardDescription>
                Configure os critérios de match em ordem de prioridade
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleAddRule}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Regra
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Regra</TableHead>
                <TableHead>Critérios</TableHead>
                <TableHead>Tolerância</TableHead>
                <TableHead>Baixa Automática</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, index) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{rule.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {rule.criteria.exactAmount && (
                        <Badge variant="secondary" className="text-xs">Valor exato</Badge>
                      )}
                      {rule.criteria.documentMatch && (
                        <Badge variant="secondary" className="text-xs">Documento</Badge>
                      )}
                      {rule.criteria.keywordMatch && (
                        <Badge variant="secondary" className="text-xs">Palavras-chave</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>± {rule.criteria.dateRange} dias</TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.autoSettle}
                      onCheckedChange={(checked) => {
                        setRules(rules.map((r) =>
                          r.id === rule.id ? { ...r, autoSettle: checked } : r
                        ));
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveConfig}>
          <Save className="mr-2 h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
