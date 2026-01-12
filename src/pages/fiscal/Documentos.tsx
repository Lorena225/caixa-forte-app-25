import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard, KPIGrid } from '@/components/dashboard/KPICard';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useFiscalDocuments, useFiscalDocumentStats, DOCUMENT_MODEL_LABELS, DOCUMENT_STATUS_LABELS } from '@/hooks/useFiscalDocuments';
import { FileText, Plus, Search, FileDown, CheckCircle, Clock, Receipt, FileSpreadsheet } from 'lucide-react';

export default function FiscalDocumentos() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: documents = [], isLoading } = useFiscalDocuments();
  const { data: stats } = useFiscalDocumentStats();

  const filteredDocuments = documents.filter((doc) =>
    activeTab === 'all' || doc.document_model === activeTab
  ).filter((doc) =>
    doc.document_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Documentos Fiscais" description="NF-e, NFS-e, CT-e - Emissão e consulta">
          <Button className="gap-2"><Plus className="h-4 w-4" />Nova Emissão</Button>
        </PageHeader>

        <KPIGrid columns={4}>
          <KPICard title="Total Mês" value={String(stats?.totalDocuments || 0)} subtitle="documentos emitidos" icon={FileText} isLoading={!stats} />
          <KPICard title="Valor Total" value={formatCurrency(stats?.totalAmount || 0)} subtitle="faturado no mês" icon={Receipt} variant="success" isLoading={!stats} />
          <KPICard title="Autorizadas" value={String(stats?.authorized || 0)} subtitle="documentos válidos" icon={CheckCircle} variant="success" isLoading={!stats} />
          <KPICard title="Pendentes" value={String(stats?.pending || 0)} subtitle="aguardando processamento" icon={Clock} variant="warning" isLoading={!stats} />
        </KPIGrid>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="55">NF-e</TabsTrigger>
                  <TabsTrigger value="nfse">NFS-e</TabsTrigger>
                  <TabsTrigger value="65">NFC-e</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-64" />
                </div>
                <Button variant="outline" size="icon"><FileDown className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <TableSkeleton columns={6} rows={5} /> : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum documento encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell><Badge variant="outline">{DOCUMENT_MODEL_LABELS[doc.document_model] || doc.document_model}</Badge></TableCell>
                      <TableCell className="font-mono">{doc.document_number}{doc.document_series && <span className="text-muted-foreground">/{doc.document_series}</span>}</TableCell>
                      <TableCell>{formatDate(doc.issue_date)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(doc.total_nf || 0))}</TableCell>
                      <TableCell><Badge variant={doc.status === 'autorizada' ? 'default' : 'secondary'}>{DOCUMENT_STATUS_LABELS[doc.status] || doc.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><FileText className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
