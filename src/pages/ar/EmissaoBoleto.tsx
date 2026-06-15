import { FormBody, FormSection, FormGrid, FormField } from "@/components/ui/form-layout";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QrCode, FileText, Send, CheckCircle2, Copy, Bot,
  Loader2, DollarSign, Calendar, User, Zap, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface BoletoForm {
  cliente_id: string;
  cliente_nome: string;
  valor: number;
  vencimento: string;
  descricao: string;
  juros_dia: number;
  multa_pct: number;
  desconto_ate: string;
  desconto_valor: number;
  tipo: "boleto" | "pix";
}

const EMPTY: BoletoForm = {
  cliente_id: "", cliente_nome: "", valor: 0,
  vencimento: new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10),
  descricao: "", juros_dia: 0.033, multa_pct: 2,
  desconto_ate: "", desconto_valor: 0, tipo: "boleto",
};

export default function AREmissaoBoleto() {
  const { user, currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BoletoForm>(EMPTY);
  const [generated, setGenerated] = useState<any>(null);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-ar", currentCompany?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("counterparties")
        .select("id, name, document_number, email")
        .eq("company_id", currentCompany!.id)
        .in("type", ["cliente", "ambos"])
        .order("name");
      return data ?? [];
    },
    enabled: !!user && !!currentCompany?.id,
  });

  const emitirMutation = useMutation({
    mutationFn: async () => {
      if (!form.valor || !form.vencimento || !form.cliente_nome)
        throw new Error("Preencha cliente, valor e vencimento");
      if (!currentCompany?.id) throw new Error("Empresa não identificada");

      // Criar título AR via RPC (resolve conta/carteira e grava log do agente)
      const { data: txId, error } = await supabase.rpc("ai_create_title", {
        p_company_id: currentCompany.id,
        p_direction: "entrada",
        p_description: form.descricao || `Cobrança — ${form.cliente_nome}`,
        p_amount: Math.abs(form.valor),
        p_due_date: form.vencimento,
        p_counterparty_id: form.cliente_id || null,
        p_notes: JSON.stringify({
          tipo_cobranca: form.tipo,
          juros_dia: form.juros_dia,
          multa_pct: form.multa_pct,
          desconto_ate: form.desconto_ate,
          desconto_valor: form.desconto_valor,
          origem: "emissao_boleto",
        }),
        p_agent_type: "AR",
        p_action_key: form.tipo === "pix" ? "gerar_pix_qr" : "emitir_boleto",
        p_action_label: form.tipo === "pix" ? "PIX Cobrança gerado" : "Boleto emitido",
        p_reason: `Emissão automática para ${form.cliente_nome} — venc. ${form.vencimento}`,
        p_autonomy_level: "N3_autonomous",
      });
      if (error) throw error;

      // Invocar Agente AR
      const { data: agentData } = await supabase.functions.invoke("agent-orchestrator", {
        body: {
          action: form.tipo === "pix" ? "gerar_pix_qr" : "emitir_boleto",
          payload: {
            transaction_id: txId,
            cliente: form.cliente_nome,
            valor: form.valor,
            vencimento: form.vencimento,
            descricao: form.descricao,
          },
        },
      });

      // Simular dados do boleto/PIX gerado
      const pixKey = `00020126${form.valor.toFixed(2).replace('.','').padStart(10,'0')}${Date.now()}`;
      return {
        transaction_id: txId,
        tipo: form.tipo,
        linha_digitavel: form.tipo === "boleto"
          ? `34191.09008 ${Math.random().toString().slice(2,12)} ${Math.random().toString().slice(2,12)} 1 ${Date.now().toString().slice(0,14)}`
          : null,
        pix_copia_cola: form.tipo === "pix" ? pixKey : null,
        valor: form.valor,
        vencimento: form.vencimento,
        cliente: form.cliente_nome,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setGenerated(data);
      toast.success(`${form.tipo === "pix" ? "PIX" : "Boleto"} gerado com sucesso!`);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao emitir"),
  });

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success("Copiado!");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-green-600" />
          Emissão de Boleto / PIX Cobrança
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Agente AR emite e envia automaticamente após geração
        </p>
      </div>

      {generated ? (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              {generated.tipo === "pix" ? "PIX Cobrança Gerado" : "Boleto Emitido"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-semibold text-sm">{generated.cliente}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="font-semibold text-sm text-green-700">{formatCurrency(generated.valor)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="font-semibold text-sm">{new Date(generated.vencimento).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>

            {generated.linha_digitavel && (
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Linha Digitável</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm flex-1 break-all">{generated.linha_digitavel}</p>
                  <Button size="sm" variant="outline" onClick={() => copiar(generated.linha_digitavel)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {generated.pix_copia_cola && (
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-muted-foreground">PIX Copia e Cola</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs flex-1 break-all text-muted-foreground">{generated.pix_copia_cola.slice(0,60)}...</p>
                  <Button size="sm" variant="outline" onClick={() => copiar(generated.pix_copia_cola)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setGenerated(null); setForm(EMPTY); }}>
                Novo {generated.tipo === "pix" ? "PIX" : "Boleto"}
              </Button>
              <Button className="gap-2 bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4" /> Enviar por e-mail/WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={form.tipo} onValueChange={(v) => setForm(p => ({ ...p, tipo: v as any }))}>
            <TabsList>
              <TabsTrigger value="boleto" className="gap-2"><FileText className="h-4 w-4" /> Boleto Bancário</TabsTrigger>
              <TabsTrigger value="pix" className="gap-2"><QrCode className="h-4 w-4" /> PIX Cobrança</TabsTrigger>
            </TabsList>
          </Tabs>

          <FormBody>
            <FormSection title="Dados da cobrança" description="Cliente, valor e vencimento do título a receber">
              <FormGrid cols={2}>
                <FormField label="Cliente" required fullWidth>
                  <Select value={form.cliente_id}
                    onValueChange={v => {
                      const c = clientes.find((x: any) => x.id === v);
                      setForm(p => ({ ...p, cliente_id: v, cliente_nome: c?.name ?? "" }));
                    }}>
                    <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!form.cliente_id && (
                    <Input className="mt-2" placeholder="Ou digite o nome do cliente"
                      value={form.cliente_nome}
                      onChange={e => setForm(p => ({ ...p, cliente_nome: e.target.value }))} />
                  )}
                </FormField>
                <FormField label="Valor" required>
                  <Input type="number" placeholder="0,00" value={form.valor || ""}
                    onChange={e => setForm(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))} />
                </FormField>
                <FormField label="Vencimento" required hint="Prazo padrão: 30 dias">
                  <Input type="date" value={form.vencimento}
                    onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))} />
                </FormField>
                <FormField label="Descrição" fullWidth>
                  <Input placeholder="Ex: Serviço de consultoria — Março/2026"
                    value={form.descricao}
                    onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
                </FormField>
              </FormGrid>
            </FormSection>

            {form.tipo === "boleto" && (
              <FormSection title="Juros, multa e desconto" description="Encargos por atraso e desconto por antecipação (opcional)">
                <FormGrid cols={2}>
                  <FormField label="Juros ao dia (%)">
                    <Input type="number" step="0.001" value={form.juros_dia}
                      onChange={e => setForm(p => ({ ...p, juros_dia: parseFloat(e.target.value) || 0 }))} />
                  </FormField>
                  <FormField label="Multa (%)">
                    <Input type="number" step="0.1" value={form.multa_pct}
                      onChange={e => setForm(p => ({ ...p, multa_pct: parseFloat(e.target.value) || 0 }))} />
                  </FormField>
                  <FormField label="Desconto até">
                    <Input type="date" value={form.desconto_ate}
                      onChange={e => setForm(p => ({ ...p, desconto_ate: e.target.value }))} />
                  </FormField>
                  <FormField label="Valor do desconto (R$)">
                    <Input type="number" value={form.desconto_valor || ""}
                      onChange={e => setForm(p => ({ ...p, desconto_valor: parseFloat(e.target.value) || 0 }))} />
                  </FormField>
                </FormGrid>
              </FormSection>
            )}
          </FormBody>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Agente AR — N3 Autônomo</p>
                  <p className="text-xs text-muted-foreground">
                    Após emissão: envia automaticamente para o cliente e adiciona na régua de cobrança
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => emitirMutation.mutate()}
              disabled={emitirMutation.isPending || !form.valor || !form.cliente_nome}
              className="gap-2 bg-green-600 hover:bg-green-700 px-6" size="lg">
              {emitirMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                : <><Zap className="h-4 w-4" /> Emitir {form.tipo === "pix" ? "PIX" : "Boleto"} — {formatCurrency(form.valor)}</>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
