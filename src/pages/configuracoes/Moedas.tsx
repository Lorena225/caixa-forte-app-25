import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { useCurrencies, Currency } from '@/hooks/useCurrencies';
import { toast } from 'sonner';
import { showDevelopmentToast } from '@/utils/devFeedback';

export default function Moedas() {
  const { data: currencies = [], isLoading } = useCurrencies();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    decimal_places: 2,
    is_active: true,
  });

  const handleOpenNew = () => {
    setEditingCurrency(null);
    setFormData({
      code: '',
      name: '',
      symbol: '',
      decimal_places: 2,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimal_places: currency.decimal_places,
      is_active: currency.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.code || !formData.name || !formData.symbol) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    // TODO: Implement save mutation when types are synced
    showDevelopmentToast('Salvar moeda');
    setIsDialogOpen(false);
  };

  const handleDelete = (currency: Currency) => {
    // TODO: Implement delete mutation when types are synced
    showDevelopmentToast(`Exclusão de ${currency.code}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moedas"
        description="Gerencie as moedas disponíveis no sistema"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Moedas Cadastradas
          </CardTitle>
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Moeda
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando moedas...
            </div>
          ) : currencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma moeda cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Símbolo</TableHead>
                  <TableHead className="text-center">Casas Decimais</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((currency) => (
                  <TableRow key={currency.id}>
                    <TableCell className="font-mono font-medium">
                      {currency.code}
                    </TableCell>
                    <TableCell>{currency.name}</TableCell>
                    <TableCell className="font-mono">{currency.symbol}</TableCell>
                    <TableCell className="text-center">
                      {currency.decimal_places}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={currency.is_active ? 'default' : 'secondary'}>
                        {currency.is_active ? (
                          <><Check className="h-3 w-3 mr-1" /> Ativo</>
                        ) : (
                          <><X className="h-3 w-3 mr-1" /> Inativo</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(currency)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(currency)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCurrency ? 'Editar Moeda' : 'Nova Moeda'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  placeholder="USD"
                  maxLength={3}
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Símbolo *</Label>
                <Input
                  id="symbol"
                  placeholder="$"
                  maxLength={5}
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Dólar Americano"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="decimals">Casas Decimais</Label>
                <Input
                  id="decimals"
                  type="number"
                  min={0}
                  max={8}
                  value={formData.decimal_places}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      decimal_places: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="active">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCurrency ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
