import { useState } from 'react';
import { Book, FileText, Download, CheckCircle, Send, RefreshCw, Eye, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/common/PageHeader';
import { useDigitalBooks, useGenerateDigitalBook, useSignDigitalBook, useTransmitDigitalBook, getBookTypeLabel } from '@/hooks/useDigitalBooks';
import { toast } from 'sonner';

const BOOK_TYPES = [
  { code: 'entrada', name: 'Livro de Entrada', icon: Download },
  { code: 'saida', name: 'Livro de Saída', icon: FileText },
  { code: 'inventario', name: 'Livro de Inventário', icon: Book },
  { code: 'apuracao_icms', name: 'Apuração ICMS', icon: FileText },
  { code: 'apuracao_ipi', name: 'Apuração IPI', icon: FileText },
  { code: 'servicos_prestados', name: 'Serviços Prestados', icon: FileText },
  { code: 'servicos_tomados', name: 'Serviços Tomados', icon: FileText },
];

export default function LivrosFiscais() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedBookType, setSelectedBookType] = useState('__all__');
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateBookType, setGenerateBookType] = useState('');
  
  const { data: books = [], isLoading } = useDigitalBooks(
    selectedYear, 
    selectedMonth !== 0 ? selectedMonth : undefined
  );
  const generateMutation = useGenerateDigitalBook();
  const signMutation = useSignDigitalBook();
  const transmitMutation = useTransmitDigitalBook();
  
  const filteredBooks = selectedBookType === '__all__' 
    ? books 
    : books.filter(b => b.book_type === selectedBookType);
  
  const handleGenerate = () => {
    if (!generateBookType) {
      toast.error('Selecione o tipo de livro');
      return;
    }
    generateMutation.mutate({
      bookType: generateBookType,
      year: selectedYear,
      month: selectedMonth,
    }, {
      onSuccess: () => setIsGenerateDialogOpen(false),
    });
  };
  
  const handleSign = (bookId: string) => {
    signMutation.mutate(bookId);
  };
  
  const handleTransmit = (bookId: string) => {
    transmitMutation.mutate(bookId);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aceito':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aceito</Badge>;
      case 'transmitido':
        return <Badge variant="default"><Send className="h-3 w-3 mr-1" />Transmitido</Badge>;
      case 'assinado':
        return <Badge variant="secondary"><PenTool className="h-3 w-3 mr-1" />Assinado</Badge>;
      case 'gerado':
        return <Badge variant="outline"><FileText className="h-3 w-3 mr-1" />Gerado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Livros Fiscais"
        description="Geração e transmissão de livros fiscais digitais"
      />

      {/* Filters and actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todos os meses</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedBookType} onValueChange={setSelectedBookType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de Livro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os tipos</SelectItem>
              {BOOK_TYPES.map(type => (
                <SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsGenerateDialogOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Gerar Livro
        </Button>
      </div>

      {/* Quick generate cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {BOOK_TYPES.slice(0, 4).map((type) => {
          const book = books.find(b => b.book_type === type.code);
          const Icon = type.icon;
          
          return (
            <Card key={type.code}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {type.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {book ? (
                  <div className="space-y-2">
                    {getStatusBadge(book.status)}
                    <p className="text-xs text-muted-foreground">
                      {book.generated_at && format(new Date(book.generated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                    {book.protocol_number && (
                      <p className="text-xs font-mono">Protocolo: {book.protocol_number}</p>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setGenerateBookType(type.code);
                      handleGenerate();
                    }}
                  >
                    Gerar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Books table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Livros Gerados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum livro encontrado para o período selecionado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell>
                      {format(new Date(book.period_year, book.period_month - 1, 1), 'MMM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getBookTypeLabel(book.book_type)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {book.file_name || '-'}
                    </TableCell>
                    <TableCell>
                      {book.generated_at 
                        ? format(new Date(book.generated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(book.status)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {book.protocol_number || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {book.status === 'gerado' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            title="Assinar"
                            onClick={() => handleSign(book.id)}
                            disabled={signMutation.isPending}
                          >
                            <PenTool className="h-4 w-4" />
                          </Button>
                        )}
                        {book.status === 'assinado' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            title="Transmitir"
                            onClick={() => handleTransmit(book.id)}
                            disabled={transmitMutation.isPending}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Download">
                          <Download className="h-4 w-4" />
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

      {/* Generate Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Livro Fiscal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Livro</Label>
              <Select value={generateBookType} onValueChange={setGenerateBookType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_TYPES.map(type => (
                    <SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={!generateBookType || generateMutation.isPending}>
              {generateMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Gerar Livro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
