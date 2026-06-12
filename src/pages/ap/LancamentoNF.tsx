import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileText, Zap, CheckCircle2, AlertTriangle,
  X, Plus, Eye, Bot, Loader2, DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface NFDraft {
  fornecedor: string;
  cnpj: string;
  numero_nf: string;
  data_emissao: string;
  data_vencimento: string;
  valor: number;
  descricao: string;
  conta_contabil: string;
  centro_custo: string;
  natureza: string;
  ai_confidence: number;
  ai_suggestions: { campo: string; valor: string; confianca: number }[];
  status: "draft" | "validating" | "ready" | "error";
}

const EMPTY_DRAFT: NFDraft = {
  fornecedor: "", cnpj: "", numero_nf: "", data_emissao: "",
  data_vencimento: "", valor: 0, descricao: "", conta_contabil: "",
  centro_custo: "", natureza: "", ai_confidence: 0, ai_suggestions: [],
  status: "draft",
};

export default function APLancamentoNF() {
  const { user, currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<NFDraft>(EMPTY_DRAFT);
  const [aiLoading, setAiLoading] = useState(false);
  const [tab, setTab] = useState<"upload" | "manual">("upload");

  const { data: contas = [] } = useQuery({
    queryKey: ["chart-of-accounts-ap"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name, account_category")
        .in("account_category", ["despesa", "custo", "passivo"])
        .eq("is_active", true)
        .order("code");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: counterparties = [] } = useQuery({
    queryKey: ["counterparties-ap"],
    queryFn: async () => {
      const { data } = await supabase
        .from("counterparties")
        .select("id, name, document_number")
        .in("type", ["fornecedor", "ambos"])
        .order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const classifyMutation = useMutation({
    mutationFn: async (nf: Partial<NFDraft>) => {
      setAiLoading(true);
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: {
          action: "classify_expense",
          payload: {
            fornecedor: nf.fornecedor,
            descricao: nf.descricao,
            valor: nf.valor,
            cnpj: nf.cnpj,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAiLoading(false);
      if (data?.conta_contabil) {
        setDraft(prev => ({
          ...prev,
          conta_contabil: data.conta_contabil ?? prev.conta_contabil,
          centro_custo: data.centro_custo ?? prev.centro_custo,
          natureza: data.natureza ?? prev.natureza,
          ai_confidence: data.confidence ?? 0,
          ai_suggestions: data.suggestions ?? [],
          status: "ready",
        }));
        toast.success(`IA classificou com ${Math.round((data.confidence ?? 0) * 100)}% de confiança`);
      }
    },
    onError: () => {
      setAiLoading(false);
      toast.error("IA indisponível — preencha manualmente");
      setDraft(prev => ({ ...prev, status: "draft" }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error("Empresa não identificada");
      const cp = counterparties.find(c =>
        c.document_number?.replace(/\D/g, "") === draft.cnpj.replace(/\D/g, "")
      );
      const { error } = await supabase.rpc("ai_create_title", {
        p_company_id: currentCompany.id,
        p_direction: "saida",
        p_description: `NF ${draft.numero_nf} — ${draft.fornecedor}`,
        p_amount: Math.abs(draft.valor),
        p_due_date: draft.data_vencimento || new Date().toISOString().slice(0, 10),
        p_counterparty_id: cp?.id ?? null,
        p_document_number: draft.numero_nf || null,
        p_notes: JSON.stringify({
          conta_contabil: draft.conta_contabil,
          centro_custo: draft.centro_custo,
          ai_confidence: draft.ai_confidence,
          origem: "lancamento_nf",
        }),
        p_agent_type: "classifier",
        p_action_key: "classificar_despesa",
        p_action_label: `NF ${draft.numero_nf} lançada — ${draft.fornecedor}`,
        p_reason: draft.ai_confidence > 0
          ? `Classificado pela IA com ${Math.round(draft.ai_confidence * 100)}% de confiança`
          : "Lançamento manual de NF",
        p_autonomy_level: "N1_approval",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("NF lançada com sucesso! Título AP criado.");
      setDraft(EMPTY_DRAFT);
    },
    onError: () => toast.error("Erro ao lançar NF"),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDraft(prev => ({ ...prev, status: "validating" }));
    toast.info("Processando NF com IA...");
    // Simula OCR — em produção conectar ao Azure Document Intelligence / GPT-4o Vision
    await new Promise(r => setTimeout(r, 1500));
    const simulated: Partial<NFDraft> = {
      numero_nf: "NF-" + Math.floor(Math.random() * 99999),
      data_emissao: new Date().toISOString().slice(0, 10),
      data_vencimento: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      valor: Math.round(Math.random() * 5000 * 100) / 100,
      descricao: "Serviço de " + (["consultoria", "manutenção", "fornecimento", "logística"][Math.floor(Math.random() * 4)]),
      fornecedor: "Fornecedor Simulado LTDA",
      cnpj: "12.345.678/0001-99",
      status: "draft",
    };
    setDraft(prev => ({ ...prev, ...simulated }));
    toast.success("Dados extraídos! Classifique com IA abaixo.");
    e.target.value = "";
  };

  const handleClassify = () => {
    if (!draft.fornecedor || !draft.descricao) {
      toast.warning("Preencha fornecedor e descrição antes de classificar");
      return;
    }
    classifyMutation.mutate(draft);
  };

  const canSave = draft.fornecedor && draft.valor > 0 && draft.data_vencimento;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Lançamento de NF
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Capture, extraia e classifique NFs automaticamente com IA
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" /> Upload NF</TabsTrigger>
          <TabsTrigger value="manual" className="gap-2"><Plus className="h-4 w-4" /> Manual</TabsTrigger>
        </TabsList>

        {/* Upload */}
        <TabsContent value="upload" className="mt-4">
          <Card className={cn("border-2 border-dashed cursor-pointer transition-colors hover:border-blue-400",
            draft.status === "validating" ? "border-blue-400 bg-blue-50" : "border-muted")}>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4"
              onClick={() => fileRef.current?.click()}>
              {draft.status === "validating" ? (
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="font-medium">
                  {draft.status === "validating" ? "Processando com IA..." : "Arraste ou clique para enviar"}
                </p>
                <p className="text-sm text-muted-foreground">PDF, XML NF-e, imagem (JPG/PNG)</p>
              </div>
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={handleFileUpload} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4" />
      </Tabs>

      {/* Formulário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fornecedor *</Label>
          <Input placeholder="Nome do fornecedor" value={draft.fornecedor}
            onChange={e => setDraft(p => ({ ...p, fornecedor: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input placeholder="00.000.000/0001-00" value={draft.cnpj}
            onChange={e => setDraft(p => ({ ...p, cnpj: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Número NF</Label>
          <Input placeholder="NF-12345" value={draft.numero_nf}
            onChange={e => setDraft(p => ({ ...p, numero_nf: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Valor *</Label>
          <Input type="number" placeholder="0,00" value={draft.valor || ""}
            onChange={e => setDraft(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div className="space-y-2">
          <Label>Data de Emissão</Label>
          <Input type="date" value={draft.data_emissao}
            onChange={e => setDraft(p => ({ ...p, data_emissao: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Data de Vencimento *</Label>
          <Input type="date" value={draft.data_vencimento}
            onChange={e => setDraft(p => ({ ...p, data_vencimento: e.target.value }))} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Descrição / Serviço</Label>
          <Input placeholder="Descrição do serviço ou produto" value={draft.descricao}
            onChange={e => setDraft(p => ({ ...p, descricao: e.target.value }))} />
        </div>
      </div>

      {/* Botão de classificação IA */}
      <Card className={cn("border-2 transition-all",
        draft.status === "ready" ? "border-green-300 bg-green-50" : "border-blue-200 bg-blue-50/50")}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Agente Classificador IA</p>
                <p className="text-xs text-muted-foreground">
                  {draft.status === "ready"
                    ? `Classificação com ${Math.round(draft.ai_confidence * 100)}% de confiança`
                    : "Classifica conta contábil, centro de custo e natureza automaticamente"}
                </p>
              </div>
            </div>
            <Button onClick={handleClassify} disabled={aiLoading || !draft.fornecedor}
              className="gap-2" variant={draft.status === "ready" ? "outline" : "default"}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {draft.status === "ready" ? "Reclassificar" : "Classificar com IA"}
            </Button>
          </div>

          {draft.status === "ready" && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Conta Contábil", value: draft.conta_contabil },
                { label: "Centro de Custo", value: draft.centro_custo },
                { label: "Natureza", value: draft.natureza },
              ].map(item => (
                <div key={item.label} className="p-2 bg-white rounded-lg border">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-medium text-sm mt-0.5">{item.value || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classificação manual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Conta Contábil</Label>
          <Select value={draft.conta_contabil} onValueChange={v => setDraft(p => ({ ...p, conta_contabil: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
            <SelectContent>
              {contas.map((c: any) => (
                <SelectItem key={c.id} value={c.code}>{c.code} — {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Natureza</Label>
          <Select value={draft.natureza} onValueChange={v => setDraft(p => ({ ...p, natureza: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="despesa_operacional">Despesa Operacional</SelectItem>
              <SelectItem value="despesa_administrativa">Despesa Administrativa</SelectItem>
              <SelectItem value="custo_produto">Custo do Produto</SelectItem>
              <SelectItem value="investimento">Investimento / CAPEX</SelectItem>
              <SelectItem value="imposto">Impostos e Taxas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Centro de Custo</Label>
          <Input placeholder="Ex: CC-001" value={draft.centro_custo}
            onChange={e => setDraft(p => ({ ...p, centro_custo: e.target.value }))} />
        </div>
      </div>

      {/* Botão lançar */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setDraft(EMPTY_DRAFT)}>Limpar</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}
          className="gap-2 bg-green-600 hover:bg-green-700">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Lançar NF — {draft.valor > 0 ? formatCurrency(draft.valor) : "R$ 0,00"}
        </Button>
      </div>
    </div>
  );
}
