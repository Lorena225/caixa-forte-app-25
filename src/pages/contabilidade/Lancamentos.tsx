import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

interface JournalLine {
  id?: string;
  line_number: number;
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
}

export default function LancamentosContabeis() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newEntry, setNewEntry] = useState({
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    notes: ''
  });
  
  const [lines, setLines] = useState<JournalLine[]>([
    { line_number: 1, account_id: '', debit_amount: 0, credit_amount: 0 },
    { line_number: 2, account_id: '', debit_amount: 0, credit_amount: 0 }
  ]);

  // Fetch journal entries
  const { data: entries, isLoading } = useQuery({
    queryKey: ['journal-entries', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('entry_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  // Fetch accounts for dropdown
  const { data: accounts } = useQuery({
    queryKey: ['accounts-gl', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const totalDebit = lines.reduce((sum, l) => sum + l.debit_amount, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit_amount, 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Débitos e créditos devem ser iguais');
      }
      
      // Generate entry number
      const { count } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id);
      
      const entryNumber = `LC${String((count || 0) + 1).padStart(6, '0')}`;
      
      // Create header
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: currentCompany.id,
          entry_number: entryNumber,
          entry_date: newEntry.entry_date,
          posting_date: newEntry.entry_date,
          description: newEntry.description,
          source_type: 'manual',
          status: 'posted',
          total_debit: totalDebit,
          total_credit: totalCredit,
          notes: newEntry.notes
        })
        .select()
        .single();
      
      if (entryError) throw entryError;
      
      // Create lines
      const linesToInsert = lines
        .filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0))
        .map(l => ({
          journal_entry_id: entry.id,
          line_number: l.line_number,
          account_id: l.account_id,
          debit_amount: l.debit_amount,
          credit_amount: l.credit_amount,
          description: l.description
        }));
      
      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(linesToInsert);
      
      if (linesError) throw linesError;
      
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setIsDialogOpen(false);
      setNewEntry({ entry_date: format(new Date(), 'yyyy-MM-dd'), description: '', notes: '' });
      setLines([
        { line_number: 1, account_id: '', debit_amount: 0, credit_amount: 0 },
        { line_number: 2, account_id: '', debit_amount: 0, credit_amount: 0 }
      ]);
      toast.success('Lançamento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const addLine = () => {
    setLines([...lines, { 
      line_number: lines.length + 1, 
      account_id: '', 
      debit_amount: 0, 
      credit_amount: 0 
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLine, value: unknown) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-muted text-muted-foreground',
      posted: 'bg-success/10 text-success',
      reversed: 'bg-destructive/10 text-destructive'
    };
    const labels = {
      draft: 'Rascunho',
      posted: 'Lançado',
      reversed: 'Estornado'
    };
    return <Badge className={styles[status as keyof typeof styles]}>{labels[status as keyof typeof labels]}</Badge>;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Lançamentos Contábeis"
          description="Lançamentos manuais com partidas dobradas"
        >
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Novo Lançamento Contábil
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Data do Lançamento</Label>
                    <Input
                      type="date"
                      value={newEntry.entry_date}
                      onChange={(e) => setNewEntry({ ...newEntry, entry_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Histórico</Label>
                    <Input
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                      placeholder="Descrição do lançamento"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Partidas</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Linha
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead className="w-[150px]">Débito</TableHead>
                        <TableHead className="w-[150px]">Crédito</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>{line.line_number}</TableCell>
                          <TableCell>
                            <select
                              className="w-full p-2 border rounded-md bg-background"
                              value={line.account_id}
                              onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                            >
                              <option value="">Selecione...</option>
                              {accounts?.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.debit_amount || ''}
                              onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                              disabled={line.credit_amount > 0}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.credit_amount || ''}
                              onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                              disabled={line.debit_amount > 0}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(index)}
                              disabled={lines.length <= 2}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className={totalDebit !== totalCredit ? 'text-destructive' : ''}>
                          {formatCurrency(totalDebit)}
                        </TableCell>
                        <TableCell className={totalDebit !== totalCredit ? 'text-destructive' : ''}>
                          {formatCurrency(totalCredit)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  
                  {!isBalanced && (
                    <p className="text-sm text-destructive mt-2">
                      Diferença: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    placeholder="Observações adicionais..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!isBalanced || !newEntry.description || createMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Lançamento
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle>Lançamentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {entries && entries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.entry_number}</TableCell>
                      <TableCell>{format(new Date(entry.entry_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.total_debit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.total_credit)}</TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lançamento contábil encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
