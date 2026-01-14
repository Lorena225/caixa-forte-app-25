import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Settings } from "lucide-react";
import { toast } from "sonner";

interface RegraFiscalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UF_LIST = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export function RegraFiscalModal({ open, onOpenChange }: RegraFiscalModalProps) {
  const [nome, setNome] = useState('');
  const [prioridade, setPrioridade] = useState('100');
  const [ufOrigem, setUfOrigem] = useState('');
  const [ufDestino, setUfDestino] = useState('');
  const [ncmPattern, setNcmPattern] = useState('');
  const [cfopSaida, setCfopSaida] = useState('');
  const [cstIcms, setCstIcms] = useState('');
  const [aliquotaIcms, setAliquotaIcms] = useState('');
  const [isAtivo, setIsAtivo] = useState(true);
  const [descricao, setDescricao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!nome) {
      toast.error("Informe o nome da regra");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual save to database
      toast.success("Regra fiscal criada com sucesso!");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Erro ao criar regra: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNome('');
    setPrioridade('100');
    setUfOrigem('');
    setUfDestino('');
    setNcmPattern('');
    setCfopSaida('');
    setCstIcms('');
    setAliquotaIcms('');
    setIsAtivo(true);
    setDescricao('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Nova Regra Fiscal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Regra Ativa</Label>
              <p className="text-sm text-muted-foreground">Ativar/desativar esta regra</p>
            </div>
            <Switch checked={isAtivo} onCheckedChange={setIsAtivo} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Regra *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: ICMS SP para SP"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Input
                type="number"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground">Menor número = maior prioridade</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>UF Origem</Label>
              <Select value={ufOrigem} onValueChange={setUfOrigem}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {UF_LIST.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>UF Destino</Label>
              <Select value={ufDestino} onValueChange={setUfDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {UF_LIST.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>NCM (Pattern)</Label>
              <Input
                value={ncmPattern}
                onChange={(e) => setNcmPattern(e.target.value)}
                placeholder="Ex: 8471*"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CFOP Saída</Label>
              <Input
                value={cfopSaida}
                onChange={(e) => setCfopSaida(e.target.value)}
                placeholder="5102"
              />
            </div>
            <div className="space-y-2">
              <Label>CST ICMS</Label>
              <Input
                value={cstIcms}
                onChange={(e) => setCstIcms(e.target.value)}
                placeholder="000"
              />
            </div>
            <div className="space-y-2">
              <Label>Alíquota ICMS (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={aliquotaIcms}
                onChange={(e) => setAliquotaIcms(e.target.value)}
                placeholder="18.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição da aplicação desta regra..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
