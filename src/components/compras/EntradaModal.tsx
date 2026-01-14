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
import { X, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { useFornecedores } from '@/hooks/useFornecedores';

interface EntradaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntradaModal({ open, onOpenChange }: EntradaModalProps) {
  const { data: fornecedores = [] } = useFornecedores();

  const [fornecedorId, setFornecedorId] = useState('');
  const [numeroNFe, setNumeroNFe] = useState('');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [valorTotal, setValorTotal] = useState('');
  const [chaveNFe, setChaveNFe] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!fornecedorId) {
      toast.error("Selecione um fornecedor");
      return;
    }
    if (!numeroNFe) {
      toast.error("Informe o número da NF-e");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual save to database
      toast.success("Entrada registrada com sucesso!");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Erro ao registrar entrada: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFornecedorId('');
    setNumeroNFe('');
    setDataEntrada(new Date().toISOString().split('T')[0]);
    setValorTotal('');
    setChaveNFe('');
    setObservacoes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nova Entrada de Mercadoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Importar XML da NF-e</p>
            <p className="text-sm text-muted-foreground mb-3">
              Arraste o arquivo XML ou clique para selecionar
            </p>
            <Button variant="outline" size="sm">
              Selecionar Arquivo
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou preencha manualmente
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_razao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número NF-e *</Label>
              <Input
                value={numeroNFe}
                onChange={(e) => setNumeroNFe(e.target.value)}
                placeholder="000000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Data da Entrada</Label>
              <Input
                type="date"
                value={dataEntrada}
                onChange={(e) => setDataEntrada(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input
                type="number"
                step="0.01"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chave de Acesso NF-e</Label>
            <Input
              value={chaveNFe}
              onChange={(e) => setChaveNFe(e.target.value)}
              placeholder="44 dígitos"
              maxLength={44}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a entrada..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Registrar Entrada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
