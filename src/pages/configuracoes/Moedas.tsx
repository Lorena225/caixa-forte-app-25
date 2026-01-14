import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Coins, RefreshCw, Plus, TrendingUp, TrendingDown, Globe
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useCurrencies, useExchangeRates, useCreateExchangeRate, Currency } from '@/hooks/useCurrencies';

export default function MoedasCambio() {
  const [showNewRateDialog, setShowNewRateDialog] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [newRate, setNewRate] = useState('');
  const [rateDate, setRateDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: exchangeRates = [], isLoading: loadingRates } = useExchangeRates();
  const createExchangeRate = useCreateExchangeRate();

  const handleSaveRate = () => {
    if (!selectedCurrency || !newRate) return;
    
    createExchangeRate.mutate({
      currency_id: selectedCurrency.id,
      rate: parseFloat(newRate),
      rate_date: rateDate,
      source: 'manual',
    }, {
      onSuccess: () => {
        setShowNewRateDialog(false);
        setNewRate('');
        setSelectedCurrency(null);
      },
    });
  };

  const getLatestRate = (currencyId: string): number | null => {
    const rate = exchangeRates.find(r => r.currency_id === currencyId);
    return rate?.rate || null;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Moedas e Câmbio"
          description="Configure moedas e gerencie taxas de câmbio"
        />

        {/* KPIs - Latest Rates */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {currencies.filter(c => c.code !== 'BRL').map((currency) => {
            const rate = getLatestRate(currency.id);
            return (
              <Card key={currency.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{currency.code}/BRL</p>
                      <p className="text-2xl font-bold">
                        {rate ? `R$ ${rate.toFixed(4)}` : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{currency.name}</p>
                    </div>
                    <div className="text-3xl">{currency.symbol}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Currencies List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Moedas Cadastradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCurrencies ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Símbolo</TableHead>
                      <TableHead>Decimais</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies.map((currency) => (
                      <TableRow key={currency.id}>
                        <TableCell className="font-mono font-bold">{currency.code}</TableCell>
                        <TableCell>{currency.name}</TableCell>
                        <TableCell className="text-lg">{currency.symbol}</TableCell>
                        <TableCell>{currency.decimal_places}</TableCell>
                        <TableCell>
                          <Badge className={currency.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }>
                            {currency.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Exchange Rate Entry */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Taxas de Câmbio
              </CardTitle>
              <Dialog open={showNewRateDialog} onOpenChange={setShowNewRateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Taxa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Taxa de Câmbio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium">Moeda</label>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {currencies.filter(c => c.code !== 'BRL').map((currency) => (
                          <Button
                            key={currency.id}
                            variant={selectedCurrency?.id === currency.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCurrency(currency)}
                          >
                            {currency.symbol} {currency.code}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Data</label>
                      <Input
                        type="date"
                        value={rateDate}
                        onChange={(e) => setRateDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Taxa (1 {selectedCurrency?.code || 'XXX'} = R$)
                      </label>
                      <Input
                        type="number"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        placeholder="0,0000"
                        step="0.0001"
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleSaveRate}
                      disabled={!selectedCurrency || !newRate || createExchangeRate.isPending}
                    >
                      Salvar Taxa
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingRates ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : exchangeRates.length === 0 ? (
                <div className="text-center py-12">
                  <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma taxa cadastrada</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Adicione taxas manualmente ou configure integração com BCB
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Moeda</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead>Fonte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.slice(0, 10).map((rate) => {
                      const currency = currencies.find(c => c.id === rate.currency_id);
                      return (
                        <TableRow key={rate.id}>
                          <TableCell>{new Date(rate.rate_date).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="font-mono">{currency?.code || '-'}</TableCell>
                          <TableCell className="text-right font-mono">
                            R$ {rate.rate.toFixed(4)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rate.source || 'manual'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Atualização Automática
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Integração com Banco Central do Brasil</p>
                <p className="text-sm text-muted-foreground">
                  Configure para buscar cotações diárias automaticamente
                </p>
              </div>
              <Button variant="outline" disabled>
                Configurar BCB API
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
