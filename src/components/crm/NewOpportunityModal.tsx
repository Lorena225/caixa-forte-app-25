import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM, Stage } from "@/hooks/useCRM";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarIcon, DollarSign, Percent, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface NewOpportunityModalProps {
  open: boolean;
  onClose: () => void;
  pipelineId?: string;
  stages: Stage[];
}

export function NewOpportunityModal({ open, onClose, pipelineId, stages }: NewOpportunityModalProps) {
  const { createOpportunity } = useCRM();
  const { currentCompany } = useAuth();
  
  const [formData, setFormData] = useState({
    title: "",
    counterparty_id: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    amount: 0,
    probability: 50,
    expected_close_date: null as Date | null,
    stage_id: stages[0]?.id || "",
    source: "",
    notes: "",
  });
  
  const [counterpartySearch, setCounterpartySearch] = useState("");
  const [showCounterpartySearch, setShowCounterpartySearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch counterparties for selection
  const { data: counterparties = [] } = useQuery({
    queryKey: ["counterparties-search", currentCompany?.id, counterpartySearch],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("counterparties")
        .select("id, name, document, type")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true)
        .limit(10);
      
      if (counterpartySearch) {
        query = query.ilike("name", `%${counterpartySearch}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const selectedCounterparty = counterparties.find(c => c.id === formData.counterparty_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createOpportunity.mutateAsync({
        title: formData.title,
        pipeline_id: pipelineId,
        stage_id: formData.stage_id,
        counterparty_id: formData.counterparty_id || undefined,
        contact_name: formData.contact_name || undefined,
        contact_email: formData.contact_email || undefined,
        contact_phone: formData.contact_phone || undefined,
        amount: formData.amount,
        probability: formData.probability,
        expected_close_date: formData.expected_close_date?.toISOString().split('T')[0],
        source: formData.source || undefined,
        notes: formData.notes || undefined,
        status: 'open',
      });
      onClose();
      // Reset form
      setFormData({
        title: "",
        counterparty_id: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        amount: 0,
        probability: 50,
        expected_close_date: null,
        stage_id: stages[0]?.id || "",
        source: "",
        notes: "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da Oportunidade *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Venda de Equipamentos - Cliente ABC"
              required
            />
          </div>

          {/* Counterparty (Customer) */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Popover open={showCounterpartySearch} onOpenChange={setShowCounterpartySearch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start"
                >
                  <Building2 className="h-4 w-4 mr-2 shrink-0" />
                  {selectedCounterparty?.name || "Selecionar cliente..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Buscar cliente..."
                    value={counterpartySearch}
                    onValueChange={setCounterpartySearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                    <CommandGroup>
                      {counterparties.map((cp) => (
                        <CommandItem
                          key={cp.id}
                          value={cp.name}
                          onSelect={() => {
                            setFormData({ ...formData, counterparty_id: cp.id });
                            setShowCounterpartySearch(false);
                          }}
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          <div>
                            <p>{cp.name}</p>
                            {cp.document && (
                              <p className="text-xs text-muted-foreground">{cp.document}</p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Contact Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Nome do Contato</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Nome do decisor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Telefone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">E-mail</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="contato@cliente.com.br"
            />
          </div>

          {/* Value & Probability */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability">Probabilidade (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Stage & Expected Close */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select 
                value={formData.stage_id} 
                onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Previsão de Fechamento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expected_close_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expected_close_date ? (
                      format(formData.expected_close_date, "PPP", { locale: ptBR })
                    ) : (
                      "Selecionar data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expected_close_date || undefined}
                    onSelect={(date) => setFormData({ ...formData, expected_close_date: date || null })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select 
              value={formData.source} 
              onValueChange={(value) => setFormData({ ...formData, source: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Como o lead chegou?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Indicação</SelectItem>
                <SelectItem value="cold_call">Prospecção Ativa</SelectItem>
                <SelectItem value="advertising">Publicidade</SelectItem>
                <SelectItem value="social_media">Redes Sociais</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
                <SelectItem value="partner">Parceiro</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre a oportunidade..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? "Criando..." : "Criar Oportunidade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
