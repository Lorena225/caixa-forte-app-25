import { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Check, AlertTriangle, Sparkles, ArrowUpCircle, ArrowDownCircle, Loader2, Wallet, Building2 } from 'lucide-react';
import { parseCSV, CSVTransaction, CSVFormat } from '@/lib/parsers/csvParser';
import { useAICategorySuggestion } from '@/hooks/useAICategorySuggestion';
import { useAccountCategories, useTransactions, useWallets, useAccounts } from '@/hooks/useCompanyData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  id: string;
  date: Date;
  description: string;
  amount: number;
  direction: 'entrada' | 'saida';
  categoryId: string | null;
  categoryName: string | null;
  categoryConfidence: number;
  isDuplicate: boolean;
  status: 'pending' | 'ready' | 'duplicate' | 'error';
  errorMessage?: string;
}

type ImportStep = 'upload' | 'mapping' | 'config' | 'preview' | 'importing' | 'complete';

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useAccountCategories();
  const { data: existingTransactions = [] } = useTransactions();
  const { data: wallets = [] } = useWallets();
  const { data: accounts = [] } = useAccounts();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawContent, setRawContent] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<CSVFormat | null>(null);
  const [customMapping, setCustomMapping] = useState<Partial<CSVFormat>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({ imported: 0, duplicates: 0, errors: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Default selections for required fields
  const [defaultWalletId, setDefaultWalletId] = useState<string>('');
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');
  
  // Set first available options as defaults
  useEffect(() => {
    if (wallets.length > 0 && !defaultWalletId) {
      setDefaultWalletId(wallets[0].id);
    }
    if (accounts.length > 0 && !defaultAccountId) {
      setDefaultAccountId(accounts[0].id);
    }
  }, [wallets, accounts, defaultWalletId, defaultAccountId]);
  
  // AI suggestion hook
  const { suggestCategory } = useAICategorySuggestion(categories, 'saida');
  
  // Check if mapping is confident
  const mappingConfidence = useMemo(() => {
    if (!detectedFormat) return { date: false, amount: false, description: false };
    return {
      date: detectedFormat.dateColumn !== undefined && detectedFormat.dateColumn >= 0,
      amount: (detectedFormat.amountColumn !== undefined && detectedFormat.amountColumn >= 0) || 
              (detectedFormat.creditColumn !== undefined || detectedFormat.debitColumn !== undefined),
      description: detectedFormat.descriptionColumn !== undefined && detectedFormat.descriptionColumn >= 0,
    };
  }, [detectedFormat]);
  
  const needsConfirmation = !mappingConfidence.date || !mappingConfidence.amount || !mappingConfidence.description;
  
  // Check for duplicates
  const checkDuplicate = useCallback((date: Date, amount: number, description: string): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingTransactions.some(t => {
      const tDate = format(new Date(t.transaction_date), 'yyyy-MM-dd');
      const tAmount = Math.abs(t.total_amount || 0);
      const tDesc = (t.description || '').toLowerCase().trim();
      return tDate === dateStr && 
             Math.abs(Math.abs(amount) - tAmount) < 0.01 && 
             tDesc === description.toLowerCase().trim();
    });
  }, [existingTransactions]);
  
  // Process parsed transactions with AI categorization
  const processTransactions = useCallback((transactions: CSVTransaction[]) => {
    const processed: ParsedRow[] = transactions.map((t, idx) => {
      const direction: 'entrada' | 'saida' = t.amount >= 0 ? 'entrada' : 'saida';
      const isDuplicate = checkDuplicate(t.date, t.amount, t.description);
      
      // Get AI suggestion
      let categoryId: string | null = null;
      let categoryName: string | null = null;
      let confidence = 0;
      
      const suggestion = suggestCategory(t.description);
      if (suggestion) {
        categoryId = suggestion.categoryId;
        confidence = suggestion.confidence;
        const cat = categories.find(c => c.id === suggestion.categoryId);
        categoryName = cat?.name || null;
      }
      
      return {
        id: `row-${idx}-${Date.now()}`,
        date: t.date,
        description: t.description,
        amount: Math.abs(t.amount),
        direction,
        categoryId,
        categoryName,
        categoryConfidence: confidence,
        isDuplicate,
        status: isDuplicate ? 'duplicate' : 'ready',
      } as ParsedRow;
    });
    
    setParsedRows(processed);
  }, [checkDuplicate, suggestCategory, categories]);
  
  // Handle file upload
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Formato inválido', { description: 'Por favor, selecione um arquivo .csv' });
      return;
    }
    
    setFile(selectedFile);
    
    const content = await selectedFile.text();
    setRawContent(content);
    
    const result = parseCSV(content);
    setHeaders(result.headers);
    setDetectedFormat(result.detectedFormat);
    
    if (!needsConfirmation || (result.detectedFormat.dateColumn !== undefined && 
        (result.detectedFormat.amountColumn !== undefined || result.detectedFormat.creditColumn !== undefined) &&
        result.detectedFormat.descriptionColumn !== undefined)) {
      processTransactions(result.transactions);
      setStep('config');
    } else {
      setStep('mapping');
    }
  }, [needsConfirmation, processTransactions]);
  
  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);
  
  // Apply custom mapping
  const applyMapping = useCallback(() => {
    const mergedFormat = { ...detectedFormat, ...customMapping };
    const result = parseCSV(rawContent, mergedFormat);
    processTransactions(result.transactions);
    setStep('config');
  }, [rawContent, detectedFormat, customMapping, processTransactions]);
  
  // Update category for a row
  const updateRowCategory = useCallback((rowId: string, categoryId: string) => {
    setParsedRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const cat = categories.find(c => c.id === categoryId);
        return { ...row, categoryId, categoryName: cat?.name || null, categoryConfidence: 100 };
      }
      return row;
    }));
  }, [categories]);
  
  // Import transactions
  const handleImport = useCallback(async () => {
    if (!currentCompany?.id || !defaultWalletId || !defaultAccountId) {
      toast.error('Configuração incompleta', { description: 'Selecione uma carteira e conta padrão' });
      return;
    }
    
    setStep('importing');
    setImportProgress(0);
    
    const toImport = parsedRows.filter(r => r.status === 'ready');
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < toImport.length; i++) {
      const row = toImport[i];
      
      try {
        const { error } = await supabase.from('transactions').insert({
          company_id: currentCompany.id,
          description: row.description,
          direction: row.direction,
          total_amount: row.amount,
          original_amount: row.amount,
          transaction_date: format(row.date, 'yyyy-MM-dd'),
          due_date: format(row.date, 'yyyy-MM-dd'),
          status: 'lancado' as const,
          wallet_id: defaultWalletId,
          account_id: defaultAccountId,
          category_id: row.categoryId || null,
        });
        
        if (error) throw error;
        imported++;
      } catch (err) {
        console.error('Error importing row:', err);
        errors++;
      }
      
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
    }
    
    const duplicates = parsedRows.filter(r => r.status === 'duplicate').length;
    setImportStats({ imported, duplicates, errors });
    
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setStep('complete');
    
    toast.success('Importação concluída!', {
      description: `${imported} transações importadas com sucesso`,
      icon: <Sparkles className="h-4 w-4" />,
    });
  }, [currentCompany?.id, parsedRows, queryClient, defaultWalletId, defaultAccountId]);
  
  // Reset state
  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setRawContent('');
    setHeaders([]);
    setDetectedFormat(null);
    setCustomMapping({});
    setParsedRows([]);
    setImportProgress(0);
    setImportStats({ imported: 0, duplicates: 0, errors: 0 });
  }, []);
  
  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);
  
  // Statistics
  const stats = useMemo(() => {
    const total = parsedRows.length;
    const ready = parsedRows.filter(r => r.status === 'ready').length;
    const duplicates = parsedRows.filter(r => r.status === 'duplicate').length;
    const categorized = parsedRows.filter(r => r.categoryId).length;
    const income = parsedRows.filter(r => r.direction === 'entrada' && r.status === 'ready').reduce((sum, r) => sum + r.amount, 0);
    const expense = parsedRows.filter(r => r.direction === 'saida' && r.status === 'ready').reduce((sum, r) => sum + r.amount, 0);
    
    return { total, ready, duplicates, categorized, income, expense };
  }, [parsedRows]);
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg" className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Extrato CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Arraste ou selecione um arquivo CSV para importar transações'}
            {step === 'mapping' && 'Confirme o mapeamento das colunas do arquivo'}
            {step === 'preview' && 'Revise as transações antes de importar'}
            {step === 'importing' && 'Importando transações...'}
            {step === 'complete' && 'Importação concluída!'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Arraste seu arquivo CSV aqui</h3>
              <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-upload"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <Button asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  Selecionar Arquivo
                </label>
              </Button>
            </div>
          )}
          
          {/* Step: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Confirmação necessária
                  </CardTitle>
                  <CardDescription>
                    Não conseguimos identificar todas as colunas automaticamente. Por favor, confirme o mapeamento:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Coluna de Data {mappingConfidence.date && <Check className="inline h-4 w-4 text-green-500" />}
                      </label>
                      <Select
                        value={String(customMapping.dateColumn ?? detectedFormat?.dateColumn ?? '')}
                        onValueChange={(v) => setCustomMapping(prev => ({ ...prev, dateColumn: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((h, idx) => (
                            <SelectItem key={idx} value={String(idx)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Coluna de Valor {mappingConfidence.amount && <Check className="inline h-4 w-4 text-green-500" />}
                      </label>
                      <Select
                        value={String(customMapping.amountColumn ?? detectedFormat?.amountColumn ?? '')}
                        onValueChange={(v) => setCustomMapping(prev => ({ ...prev, amountColumn: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((h, idx) => (
                            <SelectItem key={idx} value={String(idx)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Coluna de Descrição {mappingConfidence.description && <Check className="inline h-4 w-4 text-green-500" />}
                      </label>
                      <Select
                        value={String(customMapping.descriptionColumn ?? detectedFormat?.descriptionColumn ?? '')}
                        onValueChange={(v) => setCustomMapping(prev => ({ ...prev, descriptionColumn: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((h, idx) => (
                            <SelectItem key={idx} value={String(idx)}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
                <Button onClick={applyMapping}>Continuar</Button>
              </div>
            </div>
          )}
          
          {/* Step: Config */}
          {step === 'config' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Configuração da Importação
                  </CardTitle>
                  <CardDescription>
                    Selecione a carteira e conta padrão para as transações importadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block">Carteira</Label>
                      <Select value={defaultWalletId} onValueChange={setDefaultWalletId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a carteira..." />
                        </SelectTrigger>
                        <SelectContent>
                          {wallets.map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2 block">Conta Contábil</Label>
                      <Select value={defaultAccountId} onValueChange={setDefaultAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button>
                <Button onClick={() => setStep('preview')} disabled={!defaultWalletId || !defaultAccountId}>
                  Continuar para Prévia
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-3">
                <Card className="p-3">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-xl font-bold">{stats.total}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-sm text-muted-foreground">Para importar</div>
                  <div className="text-xl font-bold text-green-600">{stats.ready}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-sm text-muted-foreground">Duplicados</div>
                  <div className="text-xl font-bold text-yellow-600">{stats.duplicates}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Categorizados
                  </div>
                  <div className="text-xl font-bold text-blue-600">{stats.categorized}</div>
                </Card>
              </div>
              
              {/* Totals */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-green-600" />
                  <span>Receitas: <strong className="text-green-600">{formatCurrency(stats.income)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-red-600" />
                  <span>Despesas: <strong className="text-red-600">{formatCurrency(stats.expense)}</strong></span>
                </div>
              </div>
              
              {/* Table */}
              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead className="w-[50px]">Tipo</TableHead>
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[180px]">Categoria</TableHead>
                      <TableHead className="text-right w-[120px]">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row) => (
                      <TableRow key={row.id} className={cn(row.isDuplicate && "opacity-50 bg-muted/30")}>
                        <TableCell>
                          {row.isDuplicate ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Dup
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Check className="h-3 w-3" />
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.direction === 'entrada' ? (
                            <ArrowDownCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(row.date, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm" title={row.description}>
                          {row.description}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.categoryId || ''}
                            onValueChange={(v) => updateRowCategory(row.id, v)}
                            disabled={row.isDuplicate}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Sem categoria">
                                {row.categoryName && (
                                  <span className="flex items-center gap-1">
                                    {row.categoryConfidence >= 70 && <Sparkles className="h-3 w-3 text-blue-500" />}
                                    {row.categoryName}
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium text-sm",
                          row.direction === 'entrada' ? "text-green-600" : "text-red-600"
                        )}>
                          {row.direction === 'entrada' ? '+' : '-'}{formatCurrency(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
          
          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h3 className="text-lg font-medium">Importando transações...</h3>
              <div className="w-full max-w-md">
                <Progress value={importProgress} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">{importProgress}% concluído</p>
            </div>
          )}
          
          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-green-600 mb-2">Importação Concluída!</h3>
                <p className="text-muted-foreground">
                  {importStats.imported} transações importadas e categorizadas com sucesso
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{importStats.imported}</div>
                  <div className="text-xs text-muted-foreground">Importadas</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{importStats.duplicates}</div>
                  <div className="text-xs text-muted-foreground">Ignoradas (Dup)</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{importStats.errors}</div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </Card>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button>
              <Button onClick={handleImport} disabled={stats.ready === 0}>
                <Sparkles className="mr-2 h-4 w-4" />
                Importar {stats.ready} Transações
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
