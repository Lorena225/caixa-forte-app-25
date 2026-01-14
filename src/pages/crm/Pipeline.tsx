import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, DollarSign, Calendar, User, MoreVertical, Trophy, X, ChevronRight, ChevronLeft } from "lucide-react";
import { useOpportunities, usePipelineStages, useSellers, type Opportunity, type PipelineStage } from "@/hooks/useCRM";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Pipeline() {
  const { data: stages = [] } = usePipelineStages();
  const { data: opportunities = [], createOpportunity, moveOpportunity, winOpportunity, loseOpportunity } = useOpportunities({ status: "open" });
  const { data: sellers = [] } = useSellers();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newOpp, setNewOpp] = useState({ title: "", amount: "", stage_id: "", seller_id: "", expected_close_date: "" });

  const handleCreate = () => {
    if (!newOpp.title || !newOpp.stage_id) return;
    createOpportunity.mutate({
      title: newOpp.title,
      amount: parseFloat(newOpp.amount) || 0,
      stage_id: newOpp.stage_id,
      seller_id: newOpp.seller_id || undefined,
      expected_close_date: newOpp.expected_close_date || undefined,
    });
    setNewOpp({ title: "", amount: "", stage_id: "", seller_id: "", expected_close_date: "" });
    setIsNewOpen(false);
  };

  const handleMoveStage = (opp: Opportunity, direction: 'left' | 'right') => {
    const currentIndex = stages.findIndex(s => s.id === opp.stage_id);
    const newIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < stages.length) {
      const newStage = stages[newIndex];
      moveOpportunity.mutate({ id: opp.id, stage_id: newStage.id, probability: newStage.probability });
    }
  };

  const getOpportunitiesForStage = (stageId: string) => 
    opportunities.filter(o => o.stage_id === stageId);

  const getStageTotal = (stageId: string) =>
    getOpportunitiesForStage(stageId).reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Pipeline de Vendas" 
          description="Arraste oportunidades entre os estágios"
        >
          <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova Oportunidade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Oportunidade</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Título *</Label>
                  <Input 
                    value={newOpp.title} 
                    onChange={e => setNewOpp({...newOpp, title: e.target.value})}
                    placeholder="Ex: Projeto Website Empresa X"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Valor (R$)</Label>
                    <Input 
                      type="number" 
                      value={newOpp.amount}
                      onChange={e => setNewOpp({...newOpp, amount: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Previsão de Fechamento</Label>
                    <Input 
                      type="date"
                      value={newOpp.expected_close_date}
                      onChange={e => setNewOpp({...newOpp, expected_close_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Estágio *</Label>
                  <Select value={newOpp.stage_id} onValueChange={v => setNewOpp({...newOpp, stage_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {stages.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Vendedor</Label>
                  <Select value={newOpp.seller_id} onValueChange={v => setNewOpp({...newOpp, seller_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {sellers.filter(s => s.is_active).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={!newOpp.title || !newOpp.stage_id}>
                  Criar Oportunidade
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {stages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhum estágio de pipeline configurado</p>
              <Button variant="outline">Configurar Estágios</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage, stageIndex) => (
              <Card key={stage.id} className="min-w-[300px] max-w-[300px] flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: stage.color }}
                      />
                      <CardTitle className="text-base">{stage.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {getOpportunitiesForStage(stage.id).length}
                      </Badge>
                    </div>
                    {stage.probability > 0 && (
                      <Badge variant="outline">{stage.probability}%</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getStageTotal(stage.id).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="space-y-3 pr-4">
                      {getOpportunitiesForStage(stage.id).map(opp => (
                        <Card key={opp.id} className="p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{opp.title}</h4>
                              {opp.amount > 0 && (
                                <div className="flex items-center gap-1 text-sm text-emerald-600 mt-1">
                                  <DollarSign className="h-3 w-3" />
                                  {opp.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => winOpportunity.mutate({ id: opp.id })}>
                                  <Trophy className="mr-2 h-4 w-4 text-emerald-500" /> Marcar como Ganha
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => loseOpportunity.mutate({ id: opp.id, reason: "Outro" })}>
                                  <X className="mr-2 h-4 w-4 text-red-500" /> Marcar como Perdida
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            {opp.expected_close_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(opp.expected_close_date), "dd/MM")}
                              </div>
                            )}
                            {opp.seller?.name && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {opp.seller.name.split(" ")[0]}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 mt-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              disabled={stageIndex === 0}
                              onClick={() => handleMoveStage(opp, 'left')}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex-1" />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              disabled={stageIndex === stages.length - 1}
                              onClick={() => handleMoveStage(opp, 'right')}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
