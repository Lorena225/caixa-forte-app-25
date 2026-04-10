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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useClientes } from '@/hooks/useClientes';
import { useWallets } from '@/hooks/useCompanyData';

interface BoletoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoletoModal({ open, onOpenChange }: BoletoModalProps) {
  const { data: clientes = [] } = useClientes();
  const { data: wallets = [] } = useWallets();
  const contasBancarias = wallets.filter(w => w.type === 'banco');

  const [clienteId, setClienteId] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [seuNumero, setSeuNumero] = useState('');
  const [descricao, setDescricao] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!clienteId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!contaBancariaId) {
      toast.error("Selecione uma conta bancária");
      return;
    }
    if (!valor || Number(valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!dataVencimento) {
      toast.error("Informe a data de vencimento");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual save to database
      toast.success("Boleto criado com sucesso!");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Erro ao criar boleto: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setClienteId('');
    setContaBancariaId('');
    setValor('');
    setDataVencimento('');
    setSeuNumero('');
    setDescricao('');
    setInstrucoes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Novo Boleto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente (Sacado) *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_razao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta Bancária *</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Seu Número</Label>
              <Input
                value={seuNumero}
                onChange={(e) => setSeuNumero(e.target.value)}
                placeholder="Referência interna"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição que aparecerá no boleto"
            />
          </div>

          <div className="space-y-2">
            <Label>Instruções ao Caixa</Label>
            <Textarea
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              placeholder="Instruções para pagamento (multa, juros, etc)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar Boleto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
