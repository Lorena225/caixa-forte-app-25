import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useSerasa, SerasaNegativacao } from '@/hooks/useSerasa';
import { Search, Plus, Settings, FileSearch, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (date: string) => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
};

const formatDateTime = (date: string) => {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

const getScoreBadge = (score: number | null) => {
  if (!score) return <Badge variant="outline">N/A</Badge>;
  if (score >= 800) return <Badge className="bg-green-500">Excelente ({score})</Badge>;
  if (score >= 600) return <Badge className="bg-blue-500">Bom ({score})</Badge>;
  if (score >= 400) return <Badge className="bg-yellow-500">Regular ({score})</Badge>;
  return <Badge className="bg-red-500">Ruim ({score})</Badge>;
};

const getRiscoBadge = (risco: string | null) => {
  switch (risco) {
    case 'baixo': return <Badge className="bg-green-500">Baixo</Badge>;
    case 'medio': return <Badge className="bg-yellow-500">Médio</Badge>;
    case 'alto': return <Badge className="bg-orange-500">Alto</Badge>;
    case 'muito_alto': return <Badge className="bg-red-500">Muito Alto</Badge>;
    default: return <Badge variant="outline">N/A</Badge>;
  }
};

const getStatusNegativacao = (status: string) => {
  switch (status) {
    case 'pendente': return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
    case 'enviado': return <Badge className="bg-blue-500 gap-1"><RefreshCw className="h-3 w-3" />Enviado</Badge>;
    case 'negativado': return <Badge className="bg-red-500 gap-1"><AlertTriangle className="h-3 w-3" />Negativado</Badge>;
    case 'baixado': return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />Baixado</Badge>;
    case 'erro': return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>;
    case 'cancelado': return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Cancelado</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default function SerasaPage() {
  const {
    config, saveConfig, savingConfig,
    consultas, consultasLoading, createConsulta, creatingConsulta,
    negativacoes, negativacoesLoading, createNegativacao, creatingNegativacao,
    baixarNegativacao, cancelNegativacao,
  } = useSerasa();

  const [activeTab, setActiveTab] = useState('consultas');
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [showNegativacaoModal, setShowNegativacaoModal] = useState(false);
  const [showBaixaModal, setShowBaixaModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedNegativacao, setSelectedNegativacao] = useState<SerasaNegativacao | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [consultaForm, setConsultaForm] = useState({
    documento: '',
    tipo_documento: 'cpf' as 'cpf' | 'cnpj',
  });

  const [negativacaoForm, setNegativacaoForm] = useState({
    documento: '',
    tipo_documento: 'cpf' as 'cpf' | 'cnpj',
    nome_devedor: '',
    valor_divida: '',
    data_vencimento: '',
    numero_contrato: '',
    descricao_divida: '',
  });

  const [configForm, setConfigForm] = useState({
    environment: (config?.environment || 'sandbox') as 'sandbox' | 'production',
    is_active: config?.is_active ?? true,
    auto_negativar_dias: config?.auto_negativar_dias?.toString() || '30',
    auto_consulta_cnpj: config?.auto_consulta_cnpj ?? false,
  });

  const [motivoBaixa, setMotivoBaixa] = useState('');

  const handleCreateConsulta = () => {
    createConsulta({
      documento: consultaForm.documento.replace(/\D/g, ''),
      tipo_documento: consultaForm.tipo_documento,
    });
    setShowConsultaModal(false);
    setConsultaForm({ documento: '', tipo_documento: 'cpf' });
  };

  const handleCreateNegativacao = () => {
    createNegativacao({
      documento: negativacaoForm.documento.replace(/\D/g, ''),
      tipo_documento: negativacaoForm.tipo_documento,
      nome_devedor: negativacaoForm.nome_devedor,
      valor_divida: parseFloat(negativacaoForm.valor_divida),
      data_vencimento: negativacaoForm.data_vencimento,
      numero_contrato: negativacaoForm.numero_contrato || null,
      descricao_divida: negativacaoForm.descricao_divida || null,
    });
    setShowNegativacaoModal(false);
    setNegativacaoForm({
      documento: '',
      tipo_documento: 'cpf',
      nome_devedor: '',
      valor_divida: '',
      data_vencimento: '',
      numero_contrato: '',
      descricao_divida: '',
    });
  };

  const handleBaixaNegativacao = () => {
    if (selectedNegativacao && motivoBaixa) {
      baixarNegativacao({ id: selectedNegativacao.id, motivo: motivoBaixa });
      setShowBaixaModal(false);
      setSelectedNegativacao(null);
      setMotivoBaixa('');
    }
  };

  const handleSaveConfig = () => {
    saveConfig({
      environment: configForm.environment,
      is_active: configForm.is_active,
      auto_negativar_dias: parseInt(configForm.auto_negativar_dias) || 30,
      auto_consulta_cnpj: configForm.auto_consulta_cnpj,
    });
    setShowConfigModal(false);
  };

  const filteredConsultas = consultas.filter(c => 
    c.documento.includes(searchTerm) || 
    c.nome_consultado?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNegativacoes = negativacoes.filter(n =>
    n.documento.includes(searchTerm) ||
    n.nome_devedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalNegativados = negativacoes.filter(n => n.status === 'negativado').length;
  const totalPendentes = negativacoes.filter(n => n.status === 'pendente').length;
  const valorNegativado = negativacoes
    .filter(n => n.status === 'negativado')
    .reduce((sum, n) => sum + n.valor_divida, 0);

  return (
    <MainLayout>
      <PageHeader
        title="Serasa Brasil"
        description="Consulta de crédito e negativação de devedores"
        action={{
          label: 'Configurações',
          onClick: () => setShowConfigModal(true),
          icon: <Settings className="h-4 w-4" />,
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileSearch className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Consultas</p>
                <p className="text-2xl font-bold">{consultas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Negativados</p>
                <p className="text-2xl font-bold">{totalNegativados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{totalPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Download className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Negativado</p>
                <p className="text-2xl font-bold">{formatCurrency(valorNegativado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestão Serasa</CardTitle>
              <CardDescription>Consultas de crédito e negativações</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por documento ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="consultas">Consultas</TabsTrigger>
                <TabsTrigger value="negativacoes">Negativações</TabsTrigger>
              </TabsList>
              <Button
                onClick={() => activeTab === 'consultas' ? setShowConsultaModal(true) : setShowNegativacaoModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {activeTab === 'consultas' ? 'Nova Consulta' : 'Nova Negativação'}
              </Button>
            </div>

            <TabsContent value="consultas">
              {consultasLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredConsultas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma consulta encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Pendências</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConsultas.map((consulta) => (
                      <TableRow key={consulta.id}>
                        <TableCell className="font-mono">
                          <Badge variant="outline" className="mr-2">
                            {consulta.tipo_documento.toUpperCase()}
                          </Badge>
                          {consulta.documento}
                        </TableCell>
                        <TableCell>{consulta.nome_consultado || '-'}</TableCell>
                        <TableCell>{getScoreBadge(consulta.score)}</TableCell>
                        <TableCell>{getRiscoBadge(consulta.risco)}</TableCell>
                        <TableCell>{formatCurrency(consulta.pendencias_financeiras)}</TableCell>
                        <TableCell>
                          <Badge variant={consulta.status === 'concluida' ? 'default' : 'outline'}>
                            {consulta.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(consulta.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="negativacoes">
              {negativacoesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredNegativacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma negativação encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Devedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNegativacoes.map((neg) => (
                      <TableRow key={neg.id}>
                        <TableCell className="font-mono">
                          <Badge variant="outline" className="mr-2">
                            {neg.tipo_documento.toUpperCase()}
                          </Badge>
                          {neg.documento}
                        </TableCell>
                        <TableCell>{neg.nome_devedor}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(neg.valor_divida)}</TableCell>
                        <TableCell>{formatDate(neg.data_vencimento)}</TableCell>
                        <TableCell className="font-mono text-sm">{neg.protocolo_serasa || '-'}</TableCell>
                        <TableCell>{getStatusNegativacao(neg.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {neg.status === 'negativado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedNegativacao(neg);
                                  setShowBaixaModal(true);
                                }}
                              >
                                Baixar
                              </Button>
                            )}
                            {neg.status === 'pendente' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelNegativacao(neg.id)}
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal Nova Consulta */}
      <Dialog open={showConsultaModal} onOpenChange={setShowConsultaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Consulta Serasa</DialogTitle>
            <DialogDescription>
              Consulte o histórico de crédito de um CPF ou CNPJ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select
                value={consultaForm.tipo_documento}
                onValueChange={(v) => setConsultaForm({ ...consultaForm, tipo_documento: v as 'cpf' | 'cnpj' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Documento</Label>
              <Input
                placeholder={consultaForm.tipo_documento === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                value={consultaForm.documento}
                onChange={(e) => setConsultaForm({ ...consultaForm, documento: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsultaModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateConsulta} disabled={creatingConsulta || !consultaForm.documento}>
              {creatingConsulta ? 'Consultando...' : 'Consultar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Negativação */}
      <Dialog open={showNegativacaoModal} onOpenChange={setShowNegativacaoModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Negativação</DialogTitle>
            <DialogDescription>
              Registre uma dívida para negativação no Serasa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={negativacaoForm.tipo_documento}
                  onValueChange={(v) => setNegativacaoForm({ ...negativacaoForm, tipo_documento: v as 'cpf' | 'cnpj' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Documento</Label>
                <Input
                  value={negativacaoForm.documento}
                  onChange={(e) => setNegativacaoForm({ ...negativacaoForm, documento: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do Devedor</Label>
              <Input
                value={negativacaoForm.nome_devedor}
                onChange={(e) => setNegativacaoForm({ ...negativacaoForm, nome_devedor: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor da Dívida</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={negativacaoForm.valor_divida}
                  onChange={(e) => setNegativacaoForm({ ...negativacaoForm, valor_divida: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Vencimento</Label>
                <Input
                  type="date"
                  value={negativacaoForm.data_vencimento}
                  onChange={(e) => setNegativacaoForm({ ...negativacaoForm, data_vencimento: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nº Contrato (opcional)</Label>
              <Input
                value={negativacaoForm.numero_contrato}
                onChange={(e) => setNegativacaoForm({ ...negativacaoForm, numero_contrato: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={negativacaoForm.descricao_divida}
                onChange={(e) => setNegativacaoForm({ ...negativacaoForm, descricao_divida: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNegativacaoModal(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateNegativacao} 
              disabled={creatingNegativacao || !negativacaoForm.documento || !negativacaoForm.nome_devedor || !negativacaoForm.valor_divida}
            >
              {creatingNegativacao ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Baixa */}
      <Dialog open={showBaixaModal} onOpenChange={setShowBaixaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baixar Negativação</DialogTitle>
            <DialogDescription>
              Informe o motivo da baixa da negativação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo da Baixa</Label>
              <Textarea
                placeholder="Ex: Pagamento efetuado, acordo realizado..."
                value={motivoBaixa}
                onChange={(e) => setMotivoBaixa(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBaixaModal(false)}>Cancelar</Button>
            <Button onClick={handleBaixaNegativacao} disabled={!motivoBaixa}>
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Configurações */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações Serasa</DialogTitle>
            <DialogDescription>
              Configure a integração com o Serasa Brasil
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Integração Ativa</Label>
                <p className="text-sm text-muted-foreground">Habilitar consultas e negativações</p>
              </div>
              <Switch
                checked={configForm.is_active}
                onCheckedChange={(v) => setConfigForm({ ...configForm, is_active: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <Select
                value={configForm.environment}
                onValueChange={(v) => setConfigForm({ ...configForm, environment: v as 'sandbox' | 'production' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Negativar automaticamente após (dias)</Label>
              <Input
                type="number"
                value={configForm.auto_negativar_dias}
                onChange={(e) => setConfigForm({ ...configForm, auto_negativar_dias: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-consulta CNPJ</Label>
                <p className="text-sm text-muted-foreground">Consultar automaticamente novos fornecedores</p>
              </div>
              <Switch
                checked={configForm.auto_consulta_cnpj}
                onCheckedChange={(v) => setConfigForm({ ...configForm, auto_consulta_cnpj: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
