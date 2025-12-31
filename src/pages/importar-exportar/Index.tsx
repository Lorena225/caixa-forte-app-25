import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FolderTree, 
  Users, 
  Wallet, 
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Target,
  Info,
  FileText,
  History,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { downloadTemplate } from '@/lib/excel/templateGenerator';
import type { ImportTemplate, ImportEntityType, ENTITY_LABELS } from '@/lib/excel/types';

const ENTITY_ICONS_MAP: Record<ImportEntityType, React.ComponentType<{ className?: string }>> = {
  accounts: FolderTree,
  counterparties: Users,
  wallets: Wallet,
  cost_centers: Building2,
  transactions_ar: ArrowDownCircle,
  transactions_ap: ArrowUpCircle,
  transactions: BookOpen,
  budgets: Target,
};

const ENTITY_LABELS_MAP: Record<ImportEntityType, string> = {
  accounts: 'Plano de Contas',
  counterparties: 'Clientes/Fornecedores',
  wallets: 'Carteiras',
  cost_centers: 'Centros de Custo',
  transactions_ar: 'Contas a Receber',
  transactions_ap: 'Contas a Pagar',
  transactions: 'Lançamentos',
  budgets: 'Metas/Orçamento',
};

export default function ImportExportIndex() {
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ImportTemplate | null>(null);
  const [showDictionary, setShowDictionary] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('import_templates')
        .select('*')
        .eq('is_active', true)
        .order('entity');

      if (error) throw error;

      // Map the data to our ImportTemplate type
      const mappedTemplates: ImportTemplate[] = (data || []).map(t => ({
        ...t,
        columns_json: t.columns_json as unknown as ImportTemplate['columns_json'],
        sample_data_json: t.sample_data_json as unknown as ImportTemplate['sample_data_json'],
        instructions_json: t.instructions_json as unknown as ImportTemplate['instructions_json'],
      }));
      
      setTemplates(mappedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = (template: ImportTemplate) => {
    try {
      downloadTemplate(template);
      toast.success(`Modelo "${template.name}" baixado com sucesso`);
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Erro ao baixar modelo');
    }
  };

  const handleShowDictionary = (template: ImportTemplate) => {
    setSelectedTemplate(template);
    setShowDictionary(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Importar / Exportar</h1>
            <p className="text-muted-foreground">
              Baixe modelos Excel, importe dados ou exporte relatórios
            </p>
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">
              <Download className="mr-2 h-4 w-4" />
              Modelos Excel
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="export">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Modelos Oficiais para Importação</CardTitle>
                <CardDescription>
                  Baixe os modelos Excel padronizados para cada tipo de dado. Os modelos incluem instruções e exemplos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {templates.map((template) => {
                      const IconComponent = ENTITY_ICONS_MAP[template.entity as ImportEntityType] || FileText;
                      return (
                        <Card key={template.id} className="relative overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <Badge variant="secondary" className="text-xs">
                                  v{template.version}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleDownloadTemplate(template)}
                              >
                                <Download className="mr-2 h-3 w-3" />
                                Baixar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleShowDictionary(template)}
                              >
                                <Info className="mr-2 h-3 w-3" />
                                Campos
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dictionary Modal */}
            {showDictionary && selectedTemplate && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Dicionário de Campos - {selectedTemplate.name}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowDictionary(false)}>
                      Fechar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Campo</th>
                          <th className="py-2 text-left font-medium">Nome Técnico</th>
                          <th className="py-2 text-left font-medium">Tipo</th>
                          <th className="py-2 text-left font-medium">Obrigatório</th>
                          <th className="py-2 text-left font-medium">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTemplate.columns_json.map((col) => (
                          <tr key={col.name} className="border-b">
                            <td className="py-2">{col.label}</td>
                            <td className="py-2 font-mono text-xs">{col.name}</td>
                            <td className="py-2">
                              <Badge variant="outline">{col.type}</Badge>
                            </td>
                            <td className="py-2">
                              {col.required ? (
                                <Badge variant="destructive">Sim</Badge>
                              ) : (
                                <Badge variant="secondary">Não</Badge>
                              )}
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {col.description || '-'}
                              {col.options && (
                                <span className="block text-xs">
                                  Valores: {col.options.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {selectedTemplate.instructions_json.length > 0 && (
                    <div className="mt-4 rounded-lg bg-muted p-4">
                      <h4 className="mb-2 font-medium">Instruções</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {selectedTemplate.instructions_json.map((instruction, i) => (
                          <li key={i}>{instruction}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importar Dados</CardTitle>
                <CardDescription>
                  Selecione o tipo de dado que deseja importar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Object.entries(ENTITY_LABELS_MAP).map(([entity, label]) => {
                    const IconComponent = ENTITY_ICONS_MAP[entity as ImportEntityType] || FileText;
                    return (
                      <Link 
                        key={entity} 
                        to={`/importar-exportar/importar/${entity}`}
                        className="block"
                      >
                        <Card className="h-full transition-colors hover:bg-muted/50">
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <IconComponent className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-medium">{label}</h3>
                              <p className="text-sm text-muted-foreground">
                                Importar via Excel/CSV
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Exportar Dados e Relatórios</CardTitle>
                <CardDescription>
                  Exporte listas filtradas ou relatórios completos para Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Lists */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Listas e Cadastros</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Link to="/importar-exportar/exportar/transactions_ar">
                        <Button variant="outline" className="w-full justify-start">
                          <ArrowDownCircle className="mr-2 h-4 w-4" />
                          Contas a Receber
                        </Button>
                      </Link>
                      <Link to="/importar-exportar/exportar/transactions_ap">
                        <Button variant="outline" className="w-full justify-start">
                          <ArrowUpCircle className="mr-2 h-4 w-4" />
                          Contas a Pagar
                        </Button>
                      </Link>
                      <Link to="/importar-exportar/exportar/transactions">
                        <Button variant="outline" className="w-full justify-start">
                          <BookOpen className="mr-2 h-4 w-4" />
                          Lançamentos
                        </Button>
                      </Link>
                      <Link to="/importar-exportar/exportar/accounts">
                        <Button variant="outline" className="w-full justify-start">
                          <FolderTree className="mr-2 h-4 w-4" />
                          Plano de Contas
                        </Button>
                      </Link>
                      <Link to="/importar-exportar/exportar/counterparties">
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="mr-2 h-4 w-4" />
                          Clientes/Fornecedores
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  {/* Reports */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Relatórios</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Link to="/importar-exportar/exportar/report/cashflow">
                        <Button variant="outline" className="w-full justify-start">
                          <Wallet className="mr-2 h-4 w-4" />
                          Fluxo de Caixa Mensal
                        </Button>
                      </Link>
                      <Link to="/importar-exportar/exportar/report/dre">
                        <Button variant="outline" className="w-full justify-start">
                          <FileText className="mr-2 h-4 w-4" />
                          DRE - Demonstrativo de Resultados
                        </Button>
                      </Link>
                      <Link to="/importar-exportar/exportar/report/indicators">
                        <Button variant="outline" className="w-full justify-start">
                          <Target className="mr-2 h-4 w-4" />
                          Indicadores (RC)
                        </Button>
                      </Link>
                      <Link to="/importar-exportar/exportar/report/rc_flow">
                        <Button variant="outline" className="w-full justify-start">
                          <FolderTree className="mr-2 h-4 w-4" />
                          Fluxo por Conta (RC)
                        </Button>
                      </Link>
                      <Link to="/importar-exportar/exportar/report/budgets">
                        <Button variant="outline" className="w-full justify-start">
                          <Target className="mr-2 h-4 w-4" />
                          Metas x Realizado
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Link to="/importar-exportar/historico">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <History className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">Histórico de Importações</h3>
                    <p className="text-sm text-muted-foreground">
                      Visualize todas as importações realizadas, status e detalhes
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
