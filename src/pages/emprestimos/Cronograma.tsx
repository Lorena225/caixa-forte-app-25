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

// Status real: PREVISTA | GERADA | BAIXADA (enum loan_installment_status, PT-BR)
const STATUS_META: Record<string,any> = {
  PREVISTA: { label:"Prevista",  color:"text-blue-600",   bg:"bg-blue-50",   icon: Clock },
  GERADA:   { label:"Gerada",    color:"text-amber-600",  bg:"bg-amber-50", icon: Clock },
  BAIXADA:  { label:"Pago",      color:"text-green-600",  bg:"bg-green-50", icon: CheckCircle2 },
  VENCIDA:  { label:"Vencida",   color:"text-red-600",    bg:"bg-red-50",   icon: AlertTriangle },
};

export default function LoansCronograma() {
  const { user, currentCompany } = useAuth();
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
    queryKey: ["loan-installments", id],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0,10);
      const { data } = await supabase
        .from("loan_installments")
        .select("*")
        .eq("contract_id", id)
        .order("installment_no");
      return (data ?? []).map((p: any) => ({
        ...p,
        installment_num: p.installment_no,
        principal: p.amortization_amount,
        interest: p.interest_amount,
        total: p.installment_amount,
        outstanding_after: p.remaining_balance,
        // status visual: marca VENCIDA quando ainda não baixada e vencida
        display_status: p.status !== "BAIXADA" && p.due_date < hoje ? "VENCIDA" : p.status,
      }));
    },
    enabled: !!user && !!id,
  });

  const payMutation = useMutation({
    mutationFn: async (parcelaId: string) => {
      const parcela = schedule.find((p: any) => p.id === parcelaId);
      if (!parcela || !currentCompany?.id) throw new Error("Parcela ou empresa não encontrada");

      // 1. Criar título AP (transação de pagamento) via RPC — schema real
      const { data: txId, error: txErr } = await supabase.rpc("ai_create_title", {
        p_company_id: currentCompany.id,
        p_direction: "saida",
        p_description: `Parcela ${parcela.installment_num}/${schedule.length} — ${contract?.description}`,
        p_amount: parcela.total,
        p_due_date: parcela.due_date,
        p_counterparty_id: contract?.counterparty_id ?? null,
        p_document_number: contract?.contract_number ?? null,
        p_notes: `Empréstimo — parcela ${parcela.installment_num}`,
        p_agent_type: "loans",
        p_action_key: "pagar_parcela_emprestimo",
        p_action_label: `Parcela ${parcela.installment_num} paga — ${contract?.description}`,
        p_reason: `Pagamento da parcela ${parcela.installment_num} de ${schedule.length}`,
        p_autonomy_level: "N2_notify",
      });
      if (txErr) throw txErr;

      // 2. Marcar título como pago imediatamente (pagamento à vista)
      const { error: settleErr } = await supabase.rpc("ai_settle_title", {
        p_transaction_id: txId,
        p_agent_type: "loans",
        p_action_key: "pagar_parcela_emprestimo",
        p_action_label: `Parcela ${parcela.installment_num} liquidada`,
        p_reason: "Pagamento confirmado via PIX",
        p_autonomy_level: "N2_notify",
      });
      if (settleErr) throw settleErr;

      // 3. Atualizar status da parcela
      await supabase.from("loan_installments").update({
        status: "BAIXADA",
        ap_transaction_id: txId,
        generated_at: new Date().toISOString(),
      }).eq("id", parcelaId);

      // 4. Atualizar saldo devedor do contrato
      await supabase.from("loan_contracts")
        .update({ opening_balance: parcela.outstanding_after })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-installments", id] });
      queryClient.invalidateQueries({ queryKey: ["loan-contract", id] });
      queryClient.invalidateQueries({ queryKey: ["loan-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["loan-summary"] });
      toast.success("Parcela paga e título AP liquidado!");
      refetch();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao pagar parcela"),
  });

  const pagas = schedule.filter((p: any) => p.status === "BAIXADA").length;
  const total = schedule.length;
  const pctPago = total > 0 ? (pagas / total) * 100 : 0;
  const totalPago = schedule.filter((p: any) => p.status === "BAIXADA").reduce((s: number, p: any) => s + p.total, 0);
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
          { label: "Saldo devedor", value: formatCurrency(contract?.opening_balance ?? 0), color: "text-red-600" },
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
                    const meta = STATUS_META[p.display_status] ?? STATUS_META["PREVISTA"];
                    return (
                      <tr key={p.id} className={cn("border-b", p.display_status === "VENCIDA" && "bg-red-50/30")}>
                        <td className="py-2 pr-3 font-medium">{p.installment_num}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {new Date(p.due_date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-sm">{formatCurrency(p.principal)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-sm text-red-600">{formatCurrency(p.interest)}</td>
                        <td className="py-2 pr-3 text-right font-mono font-semibold">{formatCurrency(p.total)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-xs text-muted-foreground">{formatCurrency(p.outstanding_after)}</td>
                        <td className="py-2">
                          {p.status === "BAIXADA" ? (
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
