import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FileText, Calculator, CheckCircle2, Loader2, Bot, Info, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ContractForm {
  description: string; contract_number: string;
  counterparty_id: string; modality: string; amortization_system: string;
  direction: string; principal_amount: number; interest_rate: number;
  rate_period: string; indexer: string; indexer_spread: number;
  start_date: string; end_date: string; first_payment_date: string;
  installments: number; iof_amount: number; origination_fee: number;
  collateral_type: string; collateral_value: number; collateral_notes: string;
  notes: string;
}

const EMPTY: ContractForm = {
  description:"", contract_number:"", counterparty_id:"",
  modality:"term_loan", amortization_system:"price", direction:"payable",
  principal_amount:0, interest_rate:0, rate_period:"monthly",
  indexer:"prefixed", indexer_spread:0,
  start_date: new Date().toISOString().slice(0,10),
  end_date:"", first_payment_date:"",
  installments:12, iof_amount:0, origination_fee:0,
  collateral_type:"", collateral_value:0, collateral_notes:"", notes:"",
};

// Simula parcela PMT Price
function calcPMT(pv: number, rate: number, n: number): number {
  if (rate === 0) return pv / n;
  return pv * rate / (1 - Math.pow(1 + rate, -n));
}

export default function EmprestimosNovoContrato() {
  const { user, currentCompany } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContractForm>(EMPTY);
  const [preview, setPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const { data: counterparties = [] } = useQuery({
    queryKey: ["counterparties-loans"],
    queryFn: async () => {
      const { data } = await supabase.from("counterparties").select("id,name").order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const calcPreview = () => {
    const rate = form.rate_period === "annual"
      ? Math.pow(1 + form.interest_rate / 100, 1/12) - 1
      : form.interest_rate / 100;
    const rows = [];
    let balance = form.principal_amount;

    for (let i = 1; i <= Math.min(form.installments, 6); i++) {
      if (form.amortization_system === "price") {
        const pmt = calcPMT(form.principal_amount, rate, form.installments);
        const interest = balance * rate;
        const principal = pmt - interest;
        balance = Math.max(0, balance - principal);
        rows.push({ n: i, principal: ROUND(principal), interest: ROUND(interest), total: ROUND(pmt), balance: ROUND(balance) });
      } else if (form.amortization_system === "sac") {
        const amort = form.principal_amount / form.installments;
        const interest = balance * rate;
        balance = Math.max(0, balance - amort);
        rows.push({ n: i, principal: ROUND(amort), interest: ROUND(interest), total: ROUND(amort + interest), balance: ROUND(balance) });
      } else {
        // Bullet
        const interest = form.principal_amount * rate;
        rows.push({ n: i, principal: i === form.installments ? ROUND(form.principal_amount) : 0, interest: ROUND(interest), total: ROUND(i === form.installments ? form.principal_amount + interest : interest), balance: i === form.installments ? 0 : ROUND(form.principal_amount) });
      }
    }
    setPreview(rows);
    setShowPreview(true);
  };

  function ROUND(n: number) { return Math.round(n * 100) / 100; }

  const set = (k: keyof ContractForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.description || !form.principal_amount || !form.end_date)
        throw new Error("Preencha descrição, valor e data de término");

      const rate = form.rate_period === "annual"
        ? Math.pow(1 + form.interest_rate / 100, 1/12) - 1
        : form.interest_rate / 100;

      const { data: contract, error } = await supabase.from("loan_contracts").insert({
        ...form,
        interest_rate: rate,
        outstanding_balance: form.principal_amount,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;

      // Gerar cronograma via RPC
      if (form.amortization_system === "price") {
        await supabase.rpc("generate_price_schedule", {
          p_contract_id: contract.id,
          p_principal: form.principal_amount,
          p_rate_monthly: rate,
          p_installments: form.installments,
          p_first_date: form.first_payment_date || form.start_date,
        });
      } else if (form.amortization_system === "sac") {
        await supabase.rpc("generate_sac_schedule", {
          p_contract_id: contract.id,
          p_principal: form.principal_amount,
          p_rate_monthly: rate,
          p_installments: form.installments,
          p_first_date: form.first_payment_date || form.start_date,
        });
      }

      // Log agente — via RPC (resolve company_id automaticamente)
      await supabase.rpc("ai_log_action", {
        p_company_id: currentCompany?.id,
        p_agent_type: "loans",
        p_autonomy_level: "N1_approval",
        p_action_key: "gerar_cronograma",
        p_action_label: `Contrato cadastrado: ${form.description}`,
        p_entity_type: "loan_contracts",
        p_entity_id: contract.id,
        p_amount: form.principal_amount,
        p_reason: `Cronograma ${form.amortization_system.toUpperCase()} gerado automaticamente`,
        p_status: "executed",
      });

      return contract;
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ["loan-contracts"] });
      toast.success("Contrato cadastrado e cronograma gerado!");
      navigate(`/emprestimos/${contract.id}`);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cadastrar"),
  });

  const rate = form.rate_period === "annual"
    ? Math.pow(1 + form.interest_rate / 100, 1/12) - 1
    : form.interest_rate / 100;
  const pmt = form.principal_amount > 0 && form.installments > 0
    ? calcPMT(form.principal_amount, rate, form.installments)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-600" /> Novo Contrato
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cadastre empréstimo ou financiamento — cronograma gerado automaticamente
        </p>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados do Contrato</TabsTrigger>
          <TabsTrigger value="garantias">Garantias & Covenants</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Empréstimo Capital de Giro — Banco Itaú" value={form.description} onChange={e => set("description", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nº do Contrato</Label>
              <Input placeholder="EMP-2026-001" value={form.contract_number} onChange={e => set("contract_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Credor / Devedor</Label>
              <Select value={form.counterparty_id} onValueChange={v => set("counterparty_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{counterparties.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={form.modality} onValueChange={v => set("modality", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="term_loan">Empréstimo a prazo</SelectItem>
                  <SelectItem value="revolving">Revolving / CCG</SelectItem>
                  <SelectItem value="leasing">Leasing</SelectItem>
                  <SelectItem value="debenture">Debênture</SelectItem>
                  <SelectItem value="cri_cra">CRI / CRA</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sistema de Amortização</Label>
              <Select value={form.amortization_system} onValueChange={v => set("amortization_system", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Tabela Price (parcelas fixas)</SelectItem>
                  <SelectItem value="sac">SAC (amortização constante)</SelectItem>
                  <SelectItem value="bullet">Bullet (juros mensais + principal no fim)</SelectItem>
                  <SelectItem value="misto">Misto / Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direção</Label>
              <Select value={form.direction} onValueChange={v => set("direction", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payable">Passivo (empresa deve)</SelectItem>
                  <SelectItem value="receivable">Ativo (empresa recebe)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor principal *</Label>
              <Input type="number" placeholder="0,00" value={form.principal_amount || ""} onChange={e => set("principal_amount", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Nº de parcelas</Label>
              <Input type="number" value={form.installments} onChange={e => set("installments", parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label>Taxa de juros (%)</Label>
              <Input type="number" step="0.001" value={form.interest_rate || ""} onChange={e => set("interest_rate", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Período da taxa</Label>
              <Select value={form.rate_period} onValueChange={v => set("rate_period", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal (a.m.)</SelectItem>
                  <SelectItem value="annual">Anual (a.a.)</SelectItem>
                  <SelectItem value="daily">Diária (a.d.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Indexador</Label>
              <Select value={form.indexer} onValueChange={v => set("indexer", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefixed">Pré-fixado</SelectItem>
                  <SelectItem value="cdi">CDI + spread</SelectItem>
                  <SelectItem value="ipca">IPCA + spread</SelectItem>
                  <SelectItem value="selic">SELIC</SelectItem>
                  <SelectItem value="igpm">IGP-M</SelectItem>
                  <SelectItem value="tjlp">TJLP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de início *</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de término *</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Primeiro vencimento</Label>
              <Input type="date" value={form.first_payment_date} onChange={e => set("first_payment_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>IOF (R$)</Label>
              <Input type="number" value={form.iof_amount || ""} onChange={e => set("iof_amount", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Preview PMT */}
          {pmt > 0 && (
            <Card className="border-indigo-200 bg-indigo-50/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="font-medium text-sm">
                        {form.amortization_system === "bullet" ? "Juros mensais: " : "Parcela estimada: "}
                        <span className="text-indigo-700 font-bold">{formatCurrency(pmt)}</span>
                        {form.amortization_system === "sac" && " (1ª parcela, decresce)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Custo total: {formatCurrency(pmt * form.installments)} · 
                        Juros totais: {formatCurrency(pmt * form.installments - form.principal_amount)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={calcPreview} className="gap-2">
                    <BarChart3 className="h-3.5 w-3.5" /> Ver cronograma
                  </Button>
                </div>

                {showPreview && preview.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="pb-1 pr-3 text-left">Parc.</th>
                          <th className="pb-1 pr-3 text-right">Principal</th>
                          <th className="pb-1 pr-3 text-right">Juros</th>
                          <th className="pb-1 pr-3 text-right">Total</th>
                          <th className="pb-1 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map(r => (
                          <tr key={r.n} className="border-b">
                            <td className="py-1 pr-3">{r.n}</td>
                            <td className="py-1 pr-3 text-right font-mono">{formatCurrency(r.principal)}</td>
                            <td className="py-1 pr-3 text-right font-mono text-red-600">{formatCurrency(r.interest)}</td>
                            <td className="py-1 pr-3 text-right font-mono font-semibold">{formatCurrency(r.total)}</td>
                            <td className="py-1 text-right font-mono">{formatCurrency(r.balance)}</td>
                          </tr>
                        ))}
                        {form.installments > 6 && (
                          <tr><td colSpan={5} className="py-1 text-center text-muted-foreground italic">... {form.installments - 6} parcelas restantes</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="garantias" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de garantia</Label>
              <Select value={form.collateral_type} onValueChange={v => set("collateral_type", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="imovel">Imóvel</SelectItem>
                  <SelectItem value="veiculo">Veículo</SelectItem>
                  <SelectItem value="aval">Aval pessoal</SelectItem>
                  <SelectItem value="fianca_bancaria">Fiança bancária</SelectItem>
                  <SelectItem value="cdb">CDB/RDB</SelectItem>
                  <SelectItem value="recebivel">Recebíveis</SelectItem>
                  <SelectItem value="sem_garantia">Sem garantia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor da garantia (R$)</Label>
              <Input type="number" value={form.collateral_value || ""} onChange={e => set("collateral_value", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações sobre garantia</Label>
              <Input placeholder="Descrição da garantia..." value={form.collateral_notes} onChange={e => set("collateral_notes", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações gerais</Label>
              <Input placeholder="Notas internas..." value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-sm">Agente Empréstimos IA</p>
              <p className="text-xs text-muted-foreground">
                Após salvar: cronograma gerado automaticamente · agente monitora vencimentos · alertas de covenant configurados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/emprestimos")}>Cancelar</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2 bg-indigo-600 hover:bg-indigo-700 px-6">
          {saveMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin"/>Salvando...</> : <><CheckCircle2 className="h-4 w-4"/>Salvar e Gerar Cronograma</>}
        </Button>
      </div>
    </div>
  );
}
