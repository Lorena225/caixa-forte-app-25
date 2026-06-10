import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar, CheckCircle2, Clock, AlertTriangle, ArrowLeft,
  DollarSign, TrendingDown, Bot, Download, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string,any> = {
  open:    { label:"Em aberto",  color:"text-blue-600",   bg:"bg-blue-50",   icon: Clock },
  paid:    { label:"Pago",       color:"text-green-600",  bg:"bg-green-50",  icon: CheckCircle2 },
  overdue: { label:"Vencida",    color:"text-red-600",    bg:"bg-red-50",    icon: AlertTriangle },
  partial: { label:"Parcial",    color:"text-amber-600",  bg:"bg-amber-50",  icon: Clock },
};

export default function LoansCronograma() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: contract } = useQuery({
    queryKey: ["loan-contract", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("loan_contracts")
        .select("*, counterparty:counterparties(name)")
        .eq("id", id).single();
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: schedule = [], isLoading, refetch } = useQuery({
    queryKey: ["loan-schedule", id],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0,10);
      const { data } = await supabase
        .from("loan_schedule")
        .select("*")
        .eq("contract_id", id)
        .order("installment_num");
      return (data ?? []).map((p: any) => ({
        ...p,
        status: p.status === "open" && p.due_date < hoje ? "overdue" : p.status,
      }));
    },
    enabled: !!user && !!id,
  });

  const payMutation = useMutation({
    mutationFn: async (parcelaId: string) => {
      const parcela = schedule.find((p: any) => p.id === parcelaId);
      if (!parcela) throw new Error("Parcela não encontrada");

      // Criar transação de pagamento
      const { data: tx } = await supabase.from("transactions").insert({
        description: `Parcela ${parcela.installment_num} — ${contract?.description}`,
        amount: -parcela.total,
        transaction_date: new Date().toISOString().slice(0,10),
        due_date: parcela.due_date,
        category: "loan_payment",
        payment_method: "pix",
      }).select().single();

      // Atualizar status da parcela
      await supabase.from("loan_schedule").update({
        status: "paid",
        paid_date: new Date().toISOString().slice(0,10),
        paid_amount: parcela.total,
        transaction_id: tx?.id,
      }).eq("id", parcelaId);

      // Atualizar saldo devedor do contrato
      await supabase.from("loan_contracts")
        .update({ outstanding_balance: parcela.outstanding_after })
        .eq("id", id);

      // Log agente
      await supabase.from("agent_action_log").insert({
        agent_type: "AP",
        autonomy_level: "N2_notify",
        action_key: "pagar_parcela_emprestimo",
        action_label: `Parcela ${parcela.installment_num} paga — ${contract?.description}`,
        entity_type: "loan_schedule",
        entity_id: parcelaId,
        amount: parcela.total,
        reason: `Pagamento da parcela ${parcela.installment_num} de ${schedule.length}`,
        status: "executed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-schedule", id] });
      queryClient.invalidateQueries({ queryKey: ["loan-contract", id] });
      queryClient.invalidateQueries({ queryKey: ["loan-contracts"] });
      toast.success("Parcela marcada como paga!");
      refetch();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao pagar parcela"),
  });

  const pagas = schedule.filter((p: any) => p.status === "paid").length;
  const total = schedule.length;
  const pctPago = total > 0 ? (pagas / total) * 100 : 0;
  const totalPago = schedule.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + p.paid_amount, 0);
  const totalJuros = schedule.reduce((s: number, p: any) => s + p.interest, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/emprestimos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{contract?.description ?? "Carregando..."}</h1>
          <p className="text-sm text-muted-foreground">
            {contract?.counterparty?.name} · {contract?.amortization_system?.toUpperCase()} · {total} parcelas
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Saldo devedor", value: formatCurrency(contract?.outstanding_balance ?? 0), color: "text-red-600" },
          { label: "Pagas", value: `${pagas}/${total}`, color: "text-green-600" },
          { label: "Total pago", value: formatCurrency(totalPago), color: "text-blue-600" },
          { label: "Juros totais", value: formatCurrency(totalJuros), color: "text-amber-600" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={cn("text-xl font-bold font-mono mt-0.5", k.color)}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>{pctPago.toFixed(0)}% amortizado</span>
            <span>{pagas} de {total} parcelas pagas</span>
          </div>
          <Progress value={pctPago} className="h-2" />
        </CardContent>
      </Card>

      {/* Cronograma */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Cronograma de Parcelas</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando cronograma...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Nº</th>
                    <th className="pb-2 pr-3">Vencimento</th>
                    <th className="pb-2 pr-3 text-right">Principal</th>
                    <th className="pb-2 pr-3 text-right">Juros</th>
                    <th className="pb-2 pr-3 text-right">Total</th>
                    <th className="pb-2 pr-3 text-right">Saldo</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((p: any) => {
                    const meta = STATUS_META[p.status] ?? STATUS_META["open"];
                    const StatusIcon = meta.icon;
                    return (
                      <tr key={p.id} className={cn("border-b", p.status === "overdue" && "bg-red-50/30")}>
                        <td className="py-2 pr-3 font-medium">{p.installment_num}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {new Date(p.due_date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-sm">{formatCurrency(p.principal)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-sm text-red-600">{formatCurrency(p.interest)}</td>
                        <td className="py-2 pr-3 text-right font-mono font-semibold">{formatCurrency(p.total)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-xs text-muted-foreground">{formatCurrency(p.outstanding_after)}</td>
                        <td className="py-2">
                          {p.status === "paid" ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">Pago</Badge>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => payMutation.mutate(p.id)}
                              disabled={payMutation.isPending}>
                              Pagar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
