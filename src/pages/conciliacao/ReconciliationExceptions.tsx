import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { 
  AlertTriangle, CheckCircle, XCircle, Link2, Plus, 
  Search, ArrowRight, Eye, Undo2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useApproveReconciliation, useReconciliationSuggestions } from '@/hooks/useReconciliation';

// Mock data for demonstration
const mockSuggestions = [
  {
    id: '1',
    statementLine: {
      date: '2026-01-10',
      description: 'PAGTO ELETRONICO TRIBUTO',
      amount: -1250.00,
      reference: 'DOC123456',
    },
    suggestedTitle: {
      id: 't1',
      description: 'Imposto ISS Janeiro',
      counterparty: 'Prefeitura Municipal',
      dueDate: '2026-01-10',
      amount: 1250.00,
    },
    confidence: 95,
    matchReasons: ['Valor exato', 'Data exata'],
  },
  {
    id: '2',
    statementLine: {
      date: '2026-01-08',
      description: 'TED RECEBIDO - CLIENTE ABC',
      amount: 5430.00,
      reference: 'TED789012',
    },
    suggestedTitle: {
      id: 't2',
      description: 'NF 1234 - Serviços Janeiro',
      counterparty: 'Cliente ABC Ltda',
      dueDate: '2026-01-08',
      amount: 5430.00,
    },
    confidence: 88,
    matchReasons: ['Valor exato', 'Nome similar'],
  },
];

const mockUnmatched = [
  {
    id: 'u1',
    date: '2026-01-05',
    description: 'PIX RECEBIDO - JOAO SILVA',
    amount: 350.00,
    reference: 'E1234567890',
  },
  {
    id: 'u2',
    date: '2026-01-03',
    description: 'TARIFA MANUTENCAO CONTA',
    amount: -45.00,
    reference: null,
  },
];

export default function ReconciliationExceptions() {
  const [selectedSuggestion, setSelectedSuggestion] = useState<typeof mockSuggestions[0] | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUnmatched, setSelectedUnmatched] = useState<typeof mockUnmatched[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: suggestions = [] } = useReconciliationSuggestions();
  const approveReconciliation = useApproveReconciliation();

  const handleApproveSuggestion = async (suggestion: typeof mockSuggestions[0]) => {
    // In production, call the actual API
    toast.success(`Baixa confirmada para "${suggestion.suggestedTitle.description}"`);
  };

  const handleRejectSuggestion = (suggestion: typeof mockSuggestions[0]) => {
    toast.info('Sugestão rejeitada');
  };

  const handleOpenLinkDialog = (item: typeof mockUnmatched[0]) => {
    setSelectedUnmatched(item);
    setLinkDialogOpen(true);
  };

  const handleOpenCreateDialog = (item: typeof mockUnmatched[0]) => {
    setSelectedUnmatched(item);
    setCreateDialogOpen(true);
  };

  const handleLinkToTitle = () => {
    toast.success('Lançamento vinculado ao título com sucesso!');
    setLinkDialogOpen(false);
  };

  const handleCreateTitle = () => {
    toast.success('Novo título criado a partir do lançamento!');
    setCreateDialogOpen(false);
  };

  const displaySuggestions = mockSuggestions; // Use mock for now

  return (
    <div className="space-y-6">
      <Tabs defaultValue="suggestions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suggestions" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Sugestões de Baixa
            <Badge variant="secondary" className="ml-1">{displaySuggestions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unmatched" className="gap-2">
            <XCircle className="h-4 w-4" />
            Não Conciliados
            <Badge variant="secondary" className="ml-1">{mockUnmatched.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Estes lançamentos do extrato possuem correspondência provável com títulos em aberto.
              Confirme ou rejeite cada sugestão.
            </AlertDescription>
          </Alert>

          {displaySuggestions.length > 0 ? (
            <div className="space-y-4">
              {displaySuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="overflow-hidden">
                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                    {/* Statement Line */}
                    <div className="p-4 bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase mb-2">Lançamento do Extrato</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Data:</span>
                          <span className="font-medium">{formatDate(suggestion.statementLine.date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Descrição:</span>
                          <span className="font-medium text-right max-w-[200px] truncate">
                            {suggestion.statementLine.description}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Valor:</span>
                          <span className={`font-semibold ${suggestion.statementLine.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(Math.abs(suggestion.statementLine.amount))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Suggested Title */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground uppercase">Título Sugerido</p>
                        <Badge 
                          variant={suggestion.confidence >= 90 ? 'default' : 'secondary'}
                          className={suggestion.confidence >= 90 ? 'bg-success' : ''}
                        >
                          {suggestion.confidence}% match
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Título:</span>
                          <span className="font-medium text-right max-w-[200px] truncate">
                            {suggestion.suggestedTitle.description}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Contraparte:</span>
                          <span className="text-sm">{suggestion.suggestedTitle.counterparty}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Vencimento:</span>
                          <span>{formatDate(suggestion.suggestedTitle.dueDate)}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap pt-1">
                          {suggestion.matchReasons.map((reason, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 p-3 bg-muted/20 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectSuggestion(suggestion)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveSuggestion(suggestion)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmar Baixa
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <h3 className="text-lg font-medium">Nenhuma sugestão pendente</h3>
                <p className="text-muted-foreground">
                  Todas as sugestões de conciliação foram processadas.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Unmatched Tab */}
        <TabsContent value="unmatched" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Estes lançamentos do extrato não encontraram correspondência automática.
              Você pode vinculá-los a títulos existentes ou criar novos títulos.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Lançamentos Não Conciliados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUnmatched.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell className="font-mono text-sm">{item.reference || '-'}</TableCell>
                      <TableCell className={`text-right font-semibold ${item.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                        {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenLinkDialog(item)}
                          >
                            <Link2 className="mr-1 h-3 w-3" />
                            Vincular
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenCreateDialog(item)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Criar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular a Título Existente</DialogTitle>
            <DialogDescription>
              Busque e selecione um título em aberto para vincular este lançamento
            </DialogDescription>
          </DialogHeader>

          {selectedUnmatched && (
            <div className="rounded-lg border bg-muted/50 p-3 mb-4">
              <p className="text-sm text-muted-foreground">Lançamento selecionado:</p>
              <div className="flex justify-between items-center mt-1">
                <span className="font-medium">{selectedUnmatched.description}</span>
                <span className={`font-semibold ${selectedUnmatched.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(selectedUnmatched.amount)}
                </span>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, valor ou contraparte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="cursor-pointer hover:bg-muted">
                  <TableCell>NF 5678 - Consultoria</TableCell>
                  <TableCell>Cliente XYZ</TableCell>
                  <TableCell>05/01/2026</TableCell>
                  <TableCell className="text-right">R$ 350,00</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLinkToTitle}>
              <Link2 className="mr-2 h-4 w-4" />
              Vincular e Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Título</DialogTitle>
            <DialogDescription>
              Criar um título a partir deste lançamento do extrato
            </DialogDescription>
          </DialogHeader>

          {selectedUnmatched && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Dados do lançamento:</p>
                <div className="mt-2 space-y-1">
                  <p><strong>Descrição:</strong> {selectedUnmatched.description}</p>
                  <p><strong>Data:</strong> {formatDate(selectedUnmatched.date)}</p>
                  <p><strong>Valor:</strong> {formatCurrency(selectedUnmatched.amount)}</p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Um novo título será criado com status "Baixado", vinculado a este lançamento.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTitle}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Título
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
