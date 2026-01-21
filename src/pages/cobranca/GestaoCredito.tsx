import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Search,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  ChevronRight,
  Calculator,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import {
  useCreditProfiles,
  usePortfolioSummary,
  usePendingLimitRequests,
  useLossProvisions,
  useUpdateCreditLimit,
  useReviewLimitRequest,
  useBatchUpdateScores,
  useCalculateLossProvision,
  getRatingColor,
  getRiskColor
} from '@/hooks/useCreditManagement';
import { CreditProfile, PortfolioSummary } from '@/services/CreditScoringService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100);

// Helper to get summary value safely
const getSummaryValue = (summary: PortfolioSummary | null | undefined, key: keyof PortfolioSummary): number => {
  if (!summary) return 0;
  return (summary[key] as number) || 0;
};

export default function GestaoCredito() {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<CreditProfile | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [newLimit, setNewLimit] = useState('');
  const [limitReason, setLimitReason] = useState('');
  const [showProvisionDialog, setShowProvisionDialog] = useState(false);

  const { data: profiles = [], isLoading: loadingProfiles } = useCreditProfiles({
    riskLevel: riskFilter !== 'all' ? riskFilter : undefined,
    rating: ratingFilter !== 'all' ? ratingFilter : undefined
  });
  const { data: summary } = usePortfolioSummary();
  const { data: pendingRequests = [] } = usePendingLimitRequests();
  const { data: provisions = [] } = useLossProvisions();

  const updateLimit = useUpdateCreditLimit();
  const reviewRequest = useReviewLimitRequest();
  const batchUpdate = useBatchUpdateScores();
  const calculateProvision = useCalculateLossProvision();

  const filteredProfiles = profiles.filter(p => 
    !searchTerm || 
    p.counterparty?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.counterparty?.document?.includes(searchTerm)
  );

  const handleUpdateLimit = () => {
    if (selectedProfile && newLimit) {
      updateLimit.mutate({
        profileId: selectedProfile.id,
        newLimit: parseFloat(newLimit),
        reason: limitReason
      }, {
        onSuccess: () => {
          setShowLimitDialog(false);
          setNewLimit('');
          setLimitReason('');
          setSelectedProfile(null);
        }
      });
    }
  };

  const handleCalculateProvision = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    calculateProvision.mutate({
      periodStart: startOfMonth,
      periodEnd: endOfMonth
    }, {
      onSuccess: () => setShowProvisionDialog(false)
    });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Gestão de Crédito"
        description="Scoring automático, limites dinâmicos e análise de risco"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes com Crédito</p>
                <p className="text-2xl font-bold">{getSummaryValue(summary, 'total_customers')}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Limite Total</p>
                <p className="text-2xl font-bold">{formatCurrency(getSummaryValue(summary, 'total_credit_limit'))}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utilização Média</p>
                <p className="text-2xl font-bold">{formatPercent(getSummaryValue(summary, 'average_utilization'))}</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-50" />
            </div>
            <Progress value={getSummaryValue(summary, 'average_utilization')} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Perda Esperada</p>
                <p className="text-2xl font-bold">{formatCurrency(getSummaryValue(summary, 'total_expected_loss'))}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span>Baixo</span>
                </div>
                <Badge variant="secondary">{getSummaryValue(summary, 'customers_low_risk')}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-accent" />
                  <span>Médio</span>
                </div>
                <Badge variant="secondary">{getSummaryValue(summary, 'customers_medium_risk')}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-secondary" />
                  <span>Alto</span>
                </div>
                <Badge variant="secondary">{getSummaryValue(summary, 'customers_high_risk')}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <span>Crítico</span>
                </div>
                <Badge variant="secondary">{getSummaryValue(summary, 'customers_critical_risk')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição por Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {(['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'] as const).map(rating => {
                const key = `customers_${rating.toLowerCase()}` as keyof PortfolioSummary;
                const count = getSummaryValue(summary, key);
                return (
                  <div key={rating} className="text-center">
                    <div className={`h-8 w-8 rounded-full ${getRatingColor(rating)} mx-auto flex items-center justify-center text-white text-xs font-bold`}>
                      {rating}
                    </div>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles">Perfis de Crédito</TabsTrigger>
          <TabsTrigger value="requests">
            Solicitações
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="provisions">Provisões</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="LOW">Baixo</SelectItem>
                <SelectItem value="MEDIUM">Médio</SelectItem>
                <SelectItem value="HIGH">Alto</SelectItem>
                <SelectItem value="CRITICAL">Crítico</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => batchUpdate.mutate()}
              disabled={batchUpdate.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${batchUpdate.isPending ? 'animate-spin' : ''}`} />
              Atualizar Scores
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {loadingProfiles ? (
                  <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Nenhum perfil encontrado</div>
                ) : (
                  filteredProfiles.map(profile => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedProfile(profile)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full ${getRatingColor(profile.credit_rating)} flex items-center justify-center text-white font-bold text-sm`}>
                          {profile.credit_rating}
                        </div>
                        <div>
                          <p className="font-medium">{profile.counterparty?.name || 'Cliente'}</p>
                          <p className="text-sm text-muted-foreground">{profile.counterparty?.document}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p className="font-bold">{profile.credit_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Limite</p>
                          <p className="font-medium">{formatCurrency(profile.credit_limit)}</p>
                        </div>
                        <Badge className={getRiskColor(profile.risk_level)}>{profile.risk_level}</Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader><CardTitle>Solicitações Pendentes</CardTitle></CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhuma solicitação pendente</div>
              ) : (
                <div className="divide-y">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{formatCurrency(request.current_limit)} → {formatCurrency(request.requested_limit)}</p>
                        <p className="text-sm text-muted-foreground">{request.request_reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => reviewRequest.mutate({ requestId: request.id, approved: false })}>
                          <XCircle className="h-4 w-4 mr-1" />Rejeitar
                        </Button>
                        <Button size="sm" onClick={() => reviewRequest.mutate({ requestId: request.id, approved: true })}>
                          <CheckCircle className="h-4 w-4 mr-1" />Aprovar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="provisions">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowProvisionDialog(true)}>
              <Calculator className="h-4 w-4 mr-2" />Calcular Provisão
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Histórico de Provisões</CardTitle></CardHeader>
            <CardContent>
              {provisions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhuma provisão calculada</div>
              ) : (
                <div className="divide-y">
                  {provisions.map(provision => (
                    <div key={provision.id} className="py-4 grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Data</p>
                        <p className="font-medium">{format(new Date(provision.provision_date), 'MMM yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Exposição</p>
                        <p className="font-medium">{formatCurrency(provision.total_exposure)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Perda Esperada</p>
                        <p className="font-medium">{formatCurrency(provision.total_expected_loss)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Provisão</p>
                        <p className="font-medium">{formatCurrency(provision.provision_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Detail Dialog */}
      <Dialog open={!!selectedProfile && !showLimitDialog} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProfile?.counterparty?.name}</DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-3xl font-bold">{selectedProfile.credit_score}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Limite</p>
                <p className="text-xl font-bold">{formatCurrency(selectedProfile.credit_limit)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Prob. Default</p>
                <p className="text-xl font-bold">{(selectedProfile.default_probability * 100).toFixed(1)}%</p>
              </CardContent></Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProfile(null)}>Fechar</Button>
            <Button onClick={() => setShowLimitDialog(true)}>Alterar Limite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Limit Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar Limite de Crédito</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Novo Limite</Label><Input type="number" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} /></div>
            <div><Label>Motivo</Label><Textarea value={limitReason} onChange={(e) => setLimitReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLimitDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdateLimit} disabled={updateLimit.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculate Provision Dialog */}
      <Dialog open={showProvisionDialog} onOpenChange={setShowProvisionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Calcular Provisão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Calcular provisão para devedores duvidosos baseada no perfil de risco atual.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProvisionDialog(false)}>Cancelar</Button>
            <Button onClick={handleCalculateProvision} disabled={calculateProvision.isPending}>Calcular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
