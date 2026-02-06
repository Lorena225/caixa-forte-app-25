import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useGenerateBilling, useContractsStats } from "@/hooks/useContracts";

interface GenerateBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const months = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export function GenerateBillingDialog({ open, onOpenChange }: GenerateBillingDialogProps) {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [result, setResult] = useState<{ success: number; errors: number; skipped: number; messages: string[] } | null>(null);
  
  const { data: stats } = useContractsStats();
  const generateMutation = useGenerateBilling();

  const handleGenerate = async () => {
    setResult(null);
    const res = await generateMutation.mutateAsync({ month, year });
    setResult(res);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gerar Faturamento do Mês
          </DialogTitle>
          <DialogDescription>
            Esta ação irá criar contas a receber para todos os contratos ativos com faturamento automático habilitado.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Contratos Elegíveis</AlertTitle>
            <AlertDescription>
              {stats?.ativos || 0} contratos ativos serão processados.
              Contratos já faturados neste período serão ignorados.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {result && (
            <Alert variant={result.errors > 0 ? "destructive" : "default"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Resultado do Faturamento</AlertTitle>
              <AlertDescription className="space-y-1">
                <p>✅ {result.success} contrato(s) faturado(s)</p>
                {result.skipped > 0 && <p>⏭️ {result.skipped} já faturado(s)</p>}
                {result.errors > 0 && <p>❌ {result.errors} erro(s)</p>}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setResult(null); }}>
            Fechar
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Gerar Faturamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
