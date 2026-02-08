import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCRM, Opportunity, Activity } from "@/hooks/useCRM";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  Clock,
  DollarSign,
  Building2,
  User,
  Tag,
  Plus,
  Send,
  Paperclip,
  Video,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OpportunityDetailModalProps {
  opportunity: Opportunity;
  open: boolean;
  onClose: () => void;
}

export function OpportunityDetailModal({ opportunity, open, onClose }: OpportunityDetailModalProps) {
  const { useActivities, createActivity, useQuotes, updateOpportunity } = useCRM();
  const { data: activities = [], isLoading: loadingActivities } = useActivities(opportunity.id);
  const { data: quotes = [] } = useQuotes(opportunity.id);
  
  const [activeTab, setActiveTab] = useState("timeline");
  const [newActivityType, setNewActivityType] = useState<string>("note");
  const [newActivityContent, setNewActivityContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleAddActivity = async () => {
    if (!newActivityContent.trim()) return;
    setIsSubmitting(true);
    
    try {
      await createActivity.mutateAsync({
        opportunity_id: opportunity.id,
        counterparty_id: opportunity.counterparty_id,
        activity_type: newActivityType,
        subject: newActivityType === 'note' ? 'Nota' : newActivityType === 'call' ? 'Ligação' : newActivityType === 'email' ? 'E-mail' : 'Atividade',
        description: newActivityContent,
        is_completed: true,
        completed_at: new Date().toISOString(),
      });
      setNewActivityContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activityIcons: Record<string, React.ReactNode> = {
    call: <Phone className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    meeting: <Video className="h-4 w-4" />,
    whatsapp: <MessageSquare className="h-4 w-4" />,
    note: <FileText className="h-4 w-4" />,
    task: <CheckCircle2 className="h-4 w-4" />,
  };

  const activityColors: Record<string, string> = {
    call: "bg-blue-500",
    email: "bg-purple-500",
    meeting: "bg-green-500",
    whatsapp: "bg-emerald-500",
    note: "bg-gray-500",
    task: "bg-orange-500",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{opportunity.title}</DialogTitle>
              {opportunity.counterparty?.name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{opportunity.counterparty.name}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(opportunity.amount || 0)}
              </p>
              <Badge variant="outline">
                {opportunity.probability || 0}% probabilidade
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="border-b px-6">
            <TabsList className="h-12">
              <TabsTrigger value="timeline" className="gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <FileText className="h-4 w-4" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="quotes" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Propostas ({quotes.length})
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
            <TabsContent value="timeline" className="p-6 pt-4 m-0">
              {/* Quick Action Buttons */}
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Ligar
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendar
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Nova Proposta
                </Button>
              </div>

              {/* Add Activity */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Select value={newActivityType} onValueChange={setNewActivityType}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Nota</SelectItem>
                        <SelectItem value="call">Ligação</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="meeting">Reunião</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="task">Tarefa</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Adicionar atividade ou nota..."
                      value={newActivityContent}
                      onChange={(e) => setNewActivityContent(e.target.value)}
                      className="min-h-[80px] flex-1"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button 
                      size="sm" 
                      onClick={handleAddActivity}
                      disabled={!newActivityContent.trim() || isSubmitting}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              <div className="space-y-4">
                {loadingActivities ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando atividades...
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma atividade registrada
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white",
                          activityColors[activity.activity_type] || "bg-gray-500"
                        )}>
                          {activityIcons[activity.activity_type] || <Circle className="h-4 w-4" />}
                        </div>
                        {index < activities.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{activity.subject}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {activity.description}
                          </p>
                        )}
                        {activity.owner?.full_name && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {activity.owner.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{activity.owner.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="p-6 pt-4 m-0">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informações de Contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {opportunity.contact_name && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Nome</Label>
                        <p>{opportunity.contact_name}</p>
                      </div>
                    )}
                    {opportunity.contact_email && (
                      <div>
                        <Label className="text-xs text-muted-foreground">E-mail</Label>
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {opportunity.contact_email}
                        </p>
                      </div>
                    )}
                    {opportunity.contact_phone && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Telefone</Label>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {opportunity.contact_phone}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Deal Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Informações do Negócio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor</Label>
                      <p className="text-lg font-bold">{formatCurrency(opportunity.amount || 0)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Probabilidade</Label>
                      <p>{opportunity.probability || 0}%</p>
                    </div>
                    {opportunity.expected_close_date && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Previsão de Fechamento</Label>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(opportunity.expected_close_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                    {opportunity.source && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Origem</Label>
                        <p>{opportunity.source}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tags & Notes */}
                {opportunity.tags && opportunity.tags.length > 0 && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {opportunity.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {opportunity.notes && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Observações
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{opportunity.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="quotes" className="p-6 pt-4 m-0">
              {quotes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhuma proposta criada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie uma proposta comercial para esta oportunidade
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Proposta
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map(quote => (
                    <Card key={quote.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{quote.quote_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {quote.title || 'Proposta comercial'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(quote.total_amount)}</p>
                            <Badge variant={
                              quote.status === 'accepted' ? 'default' :
                              quote.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }>
                              {quote.status === 'draft' ? 'Rascunho' :
                               quote.status === 'sent' ? 'Enviada' :
                               quote.status === 'accepted' ? 'Aceita' :
                               quote.status === 'rejected' ? 'Recusada' :
                               quote.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="chat" className="p-6 pt-4 m-0">
              <div className="flex flex-col h-[400px]">
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p>Chat integrado com WhatsApp</p>
                    <p className="text-sm">As mensagens aparecerão aqui</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="icon">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input placeholder="Digite sua mensagem..." className="flex-1" />
                  <Button>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
