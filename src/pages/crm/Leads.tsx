import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Phone, Mail, Building2, ArrowRight, Flame, Thermometer, Snowflake } from "lucide-react";
import { useLeads, useSellers, usePipelineStages, type Lead } from "@/hooks/useCRM";
import { format } from "date-fns";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Novo", variant: "default" },
  contacted: { label: "Contatado", variant: "secondary" },
  qualified: { label: "Qualificado", variant: "outline" },
  unqualified: { label: "Desqualificado", variant: "destructive" },
  converted: { label: "Convertido", variant: "default" },
};

const temperatureIcons: Record<string, React.ReactNode> = {
  hot: <Flame className="h-4 w-4 text-red-500" />,
  warm: <Thermometer className="h-4 w-4 text-amber-500" />,
  cold: <Snowflake className="h-4 w-4 text-blue-500" />,
};

const sourceLabels: Record<string, string> = {
  website: "Website",
  referral: "Indicação",
  cold_call: "Prospecção",
  marketing: "Marketing",
  social: "Redes Sociais",
  event: "Evento",
};

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: leads = [], createLead, updateLead, convertToOpportunity } = useLeads({ 
    search: search || undefined, 
    status: statusFilter || undefined 
  });
  const { data: sellers = [] } = useSellers();
  const { data: stages = [] } = usePipelineStages();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company_name: "", position: "", source: "", notes: "" });
  const [convertData, setConvertData] = useState({ title: "", amount: "", stage_id: "" });

  const handleCreate = () => {
    if (!newLead.name) return;
    createLead.mutate(newLead);
    setNewLead({ name: "", email: "", phone: "", company_name: "", position: "", source: "", notes: "" });
    setIsNewOpen(false);
  };

  const handleConvert = () => {
    if (!selectedLead || !convertData.title || !convertData.stage_id) return;
    convertToOpportunity.mutate({
      leadId: selectedLead.id,
      opportunityData: {
        title: convertData.title,
        amount: parseFloat(convertData.amount) || 0,
        stage_id: convertData.stage_id,
        seller_id: selectedLead.seller_id,
      },
    });
    setIsConvertOpen(false);
    setSelectedLead(null);
    setConvertData({ title: "", amount: "", stage_id: "" });
  };

  const openConvertDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setConvertData({ title: `Oportunidade - ${lead.company_name || lead.name}`, amount: "", stage_id: stages[0]?.id || "" });
    setIsConvertOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Leads" description="Gestão de leads e prospecção">
          <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Lead</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nome *</Label>
                  <Input value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Empresa</Label>
                    <Input value={newLead.company_name} onChange={e => setNewLead({...newLead, company_name: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Cargo</Label>
                    <Input value={newLead.position} onChange={e => setNewLead({...newLead, position: e.target.value})} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Origem</Label>
                  <Select value={newLead.source} onValueChange={v => setNewLead({...newLead, source: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(sourceLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Observações</Label>
                  <Textarea value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
                </div>
                <Button onClick={handleCreate} disabled={!newLead.name}>Criar Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-10" 
                    placeholder="Buscar leads..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(statusLabels).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Temp.</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          {lead.company_name && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {lead.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" /> {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.source && sourceLabels[lead.source]}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusLabels[lead.status]?.variant || "secondary"}>
                          {statusLabels[lead.status]?.label || lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {temperatureIcons[lead.temperature]}
                      </TableCell>
                      <TableCell>
                        {format(new Date(lead.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {lead.status !== "converted" && lead.status !== "unqualified" && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openConvertDialog(lead)}
                          >
                            <ArrowRight className="mr-1 h-4 w-4" /> Converter
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Convert Dialog */}
        <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Converter Lead em Oportunidade</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Título da Oportunidade *</Label>
                <Input 
                  value={convertData.title} 
                  onChange={e => setConvertData({...convertData, title: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Valor Estimado (R$)</Label>
                <Input 
                  type="number"
                  value={convertData.amount} 
                  onChange={e => setConvertData({...convertData, amount: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Estágio Inicial *</Label>
                <Select value={convertData.stage_id} onValueChange={v => setConvertData({...convertData, stage_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleConvert} disabled={!convertData.title || !convertData.stage_id}>
                Converter para Oportunidade
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
