// =====================================================
// CENTRAL DE RELATÓRIOS AVANÇADOS (50+ Reports)
// =====================================================

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Star,
  StarOff,
  Play,
  Calendar,
  Clock,
  FileSpreadsheet,
  TrendingUp,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  BarChart3,
  BookOpen,
  Settings,
  Download,
  History,
  Filter,
} from 'lucide-react';
import { 
  useReportCatalog, 
  useReportFavorites, 
  useToggleReportFavorite,
  useReportExecutions,
  useReportStats,
  useExecuteReport,
} from '@/hooks/useAdvancedReports';
import { REPORT_CATEGORIES, ReportCategory, ReportDefinition } from '@/types/advancedReports';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORY_ICONS: Record<ReportCategory, React.ReactNode> = {
  financeiro: <TrendingUp className="h-5 w-5" />,
  caixa: <Wallet className="h-5 w-5" />,
  ar: <ArrowDownCircle className="h-5 w-5" />,
  ap: <ArrowUpCircle className="h-5 w-5" />,
  tributario: <Receipt className="h-5 w-5" />,
  gerencial: <BarChart3 className="h-5 w-5" />,
  contabil: <BookOpen className="h-5 w-5" />,
  operacional: <Settings className="h-5 w-5" />,
};

export default function CentralRelatorios() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all' | 'favorites'>('all');
  
  const { reports, byCategory, searchReports } = useReportCatalog();
  const { data: favorites = [] } = useReportFavorites();
  const { data: executions = [] } = useReportExecutions(10);
  const { data: stats } = useReportStats();
  const toggleFavorite = useToggleReportFavorite();
  const executeReport = useExecuteReport();
  
  const favoriteSet = useMemo(() => new Set(favorites.map(f => f.report_code)), [favorites]);
  
  const filteredReports = useMemo(() => {
    let result = searchQuery ? searchReports(searchQuery) : reports;
    
    if (selectedCategory === 'favorites') {
      result = result.filter(r => favoriteSet.has(r.code));
    } else if (selectedCategory !== 'all') {
      result = result.filter(r => r.category === selectedCategory);
    }
    
    return result;
  }, [reports, searchQuery, selectedCategory, favoriteSet, searchReports]);
  
  const handleRunReport = (report: ReportDefinition) => {
    executeReport.mutate({
      reportCode: report.code,
      reportName: report.name,
      parameters: {},
      exportFormat: 'excel',
    });
  };
  
  const handleToggleFavorite = (reportCode: string) => {
    toggleFavorite.mutate({
      reportCode,
      isFavorite: favoriteSet.has(reportCode),
    });
  };
  
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Central de Relatórios"
          description={`${reports.length} relatórios disponíveis para geração e exportação`}
        />
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalAvailable || 0}</p>
                  <p className="text-xs text-muted-foreground">Relatórios</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent text-accent-foreground">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalFavorites || 0}</p>
                  <p className="text-xs text-muted-foreground">Favoritos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.reportsGenerated || 0}</p>
                  <p className="text-xs text-muted-foreground">Gerados (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activeSchedules || 0}</p>
                  <p className="text-xs text-muted-foreground">Agendados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar relatórios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" asChild>
              <a href="/relatorios/historico">
                <History className="h-4 w-4 mr-2" />
                Histórico
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/relatorios/agendamentos">
                <Calendar className="h-4 w-4 mr-2" />
                Agendamentos
              </a>
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                <Button
                  variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('all')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Todos
                  <Badge variant="secondary" className="ml-auto">{reports.length}</Badge>
                </Button>
                
                <Button
                  variant={selectedCategory === 'favorites' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('favorites')}
                >
                  <Star className="h-4 w-4 mr-2 text-primary" />
                  Favoritos
                  <Badge variant="secondary" className="ml-auto">{favorites.length}</Badge>
                </Button>
                
                <div className="h-px bg-border my-2" />
                
                {(Object.keys(REPORT_CATEGORIES) as ReportCategory[]).map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {CATEGORY_ICONS[category]}
                    <span className="ml-2">{REPORT_CATEGORIES[category].name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {byCategory[category]?.length || 0}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Reports Grid */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="grid" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredReports.length} relatório(s) encontrado(s)
                </p>
                <TabsList>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="list">Lista</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="grid" className="mt-4">
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredReports.map((report) => (
                    <Card key={report.code} className="group hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-muted">
                              {CATEGORY_ICONS[report.category]}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-medium leading-tight">
                                {report.name}
                              </CardTitle>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {REPORT_CATEGORIES[report.category].name}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleToggleFavorite(report.code)}
                          >
                            {favoriteSet.has(report.code) ? (
                              <Star className="h-4 w-4 fill-primary text-primary" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <CardDescription className="text-xs mt-2 line-clamp-2">
                          {report.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleRunReport(report)}
                            disabled={executeReport.isPending}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Gerar
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {filteredReports.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum relatório encontrado</p>
                    <p className="text-sm">Tente ajustar os filtros ou a busca</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="list" className="mt-4">
                <Card>
                  <ScrollArea className="h-[600px]">
                    <div className="divide-y">
                      {filteredReports.map((report) => (
                        <div 
                          key={report.code} 
                          className="flex items-center justify-between p-4 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleFavorite(report.code)}
                            >
                              {favoriteSet.has(report.code) ? (
                                <Star className="h-4 w-4 fill-primary text-primary" />
                              ) : (
                                <StarOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <div>
                              <p className="font-medium">{report.name}</p>
                              <p className="text-sm text-muted-foreground">{report.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {REPORT_CATEGORIES[report.category].name}
                            </Badge>
                            <Button 
                              size="sm"
                              onClick={() => handleRunReport(report)}
                              disabled={executeReport.isPending}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Gerar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Recent Executions */}
        {executions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Relatórios Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                {executions.slice(0, 5).map((exec) => (
                  <Card key={exec.id} className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="font-medium text-sm truncate">{exec.reportName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(exec.createdAt), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                      <Badge 
                        variant={exec.status === 'completed' ? 'default' : 'secondary'}
                        className="mt-2"
                      >
                        {exec.status === 'completed' ? 'Concluído' : exec.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
