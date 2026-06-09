// =====================================================
// BLOCO 5: DASHBOARD MODULAR DRAG-AND-DROP
// src/pages/dashboards/GroupDashboard.tsx
// VirtruvIA · Blueprint Sistema Financeiro v1.0
// =====================================================
// Camada 5 do Blueprint: blocos arrastar/soltar,
// visão single-empresa, consolidada e comparativa,
// filtros globais persistentes (empresa/período/cenário)
// =====================================================

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, BarChart3, PieChart, ArrowLeftRight,
  RefreshCw, Settings, Eye, EyeOff, GripVertical,
  Plus, X, ChevronDown, Building, Globe, Layers,
  Activity, Target, CreditCard, Landmark,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────

type ViewMode = "single" | "consolidated" | "comparative" | "cross_lens";
type Scenario  = "actual" | "budget" | "forecast";
type BlockType =
  | "kpi_cash" | "kpi_ar" | "kpi_ap" | "kpi_revenue" | "kpi_result"
  | "chart_cashflow" | "chart_dre" | "chart_aging"
  | "intercompany_pending" | "agent_digest"
  | "budget_variance" | "credit_scores";

interface DashboardBlock {
  id: string;
  type: BlockType;
  title: string;
  col: number;   // 1 ou 2 (coluna no grid de 2)
  row: number;
  visible: boolean;
}

interface GlobalFilters {
  company_id: string | null;
  group_id:   string | null;
  year:       number;
  month:      number;
  scenario:   Scenario;
  currency:   string;
}

// ─── Biblioteca de blocos disponíveis ─────────────────

const BLOCK_LIBRARY: Record<BlockType, {
  title: string;
  icon: React.ElementType;
  description: string;
  category: string;
}> = {
  kpi_cash:            { title: "Saldo em Caixa",       icon: Landmark,        description: "Posição bancária consolidada",         category: "KPIs" },
  kpi_ar:              { title: "A Receber",             icon: TrendingUp,       description: "Total de contas a receber em aberto",  category: "KPIs" },
  kpi_ap:              { title: "A Pagar",               icon: TrendingDown,     description: "Total de contas a pagar em aberto",    category: "KPIs" },
  kpi_revenue:         { title: "Receita do Período",    icon: DollarSign,       description: "Receita realizada vs orçada",          category: "KPIs" },
  kpi_result:          { title: "Resultado Líquido",     icon: Activity,         description: "Lucro/Prejuízo do período",            category: "KPIs" },
  chart_cashflow:      { title: "Fluxo de Caixa",        icon: BarChart3,        description: "Gráfico de fluxo realizado + projetado", category: "Gráficos" },
  chart_dre:           { title: "DRE Interativa",        icon: PieChart,         description: "Demonstrativo de Resultado por conta",  category: "Gráficos" },
  chart_aging:         { title: "Aging de Títulos",      icon: AlertTriangle,    description: "Distribuição de vencimentos AR/AP",     category: "Tabelas" },
  intercompany_pending:{ title: "Intercompany Pendente", icon: ArrowLeftRight,   description: "Operações entre empresas a eliminar",  category: "Grupo" },
  agent_digest:        { title: "Digest dos Agentes IA", icon: Activity,         description: "Resumo das ações autônomas do dia",    category: "IA" },
  budget_variance:     { title: "Variação Orçamentária", icon: Target,           description: "Budget × Real × Forecast",             category: "Gráficos" },
  credit_scores:       { title: "Scores de Crédito",     icon: CreditCard,       description: "Ranking de clientes por score",        category: "Tabelas" },
};

// ─── KPI Card Componente ──────────────────────────────

function KPICard({
  label, value, sub, trend, icon: Icon, loading, colorClass,
}: {
  label: string; value: string; sub?: string; trend?: number;
  icon: React.ElementType; loading?: boolean; colorClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <Icon size={16} className={colorClass ?? "text-gray-400"} />
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <span className="text-2xl font-semibold text-gray-900">{value}</span>
      )}
      <div className="flex items-center gap-2">
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Block Renderer ───────────────────────────────────

function BlockContent({
  type, filters, data,
}: {
  type: BlockType;
  filters: GlobalFilters;
  data: Record<string, unknown>;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);

  switch (type) {
    case "kpi_cash":
      return (
        <KPICard label="Saldo em Caixa" value={fmt((data.cash_balance as number) ?? 0)}
          sub="atualizado agora" trend={2.3} icon={Landmark} colorClass="text-blue-500" />
      );
    case "kpi_ar":
      return (
        <KPICard label="A Receber" value={fmt((data.ar_total as number) ?? 0)}
          sub={`${data.ar_overdue_count ?? 0} vencidos`} trend={-5.1} icon={TrendingUp} colorClass="text-emerald-500" />
      );
    case "kpi_ap":
      return (
        <KPICard label="A Pagar" value={fmt((data.ap_total as number) ?? 0)}
          sub={`próx. 30 dias: ${fmt((data.ap_next30 as number) ?? 0)}`} icon={TrendingDown} colorClass="text-amber-500" />
      );
    case "kpi_revenue":
      return (
        <KPICard label="Receita do Período" value={fmt((data.revenue_actual as number) ?? 0)}
          sub={`orçado: ${fmt((data.revenue_budget as number) ?? 0)}`}
          trend={((data.revenue_actual as number ?? 0) / Math.max((data.revenue_budget as number ?? 1), 1) - 1) * 100}
          icon={DollarSign} colorClass="text-purple-500" />
      );
    case "kpi_result":
      return (
        <KPICard label="Resultado Líquido" value={fmt((data.net_result as number) ?? 0)}
          sub="receita - custo - despesa" trend={(data.result_trend as number) ?? 0}
          icon={Activity} colorClass="text-indigo-500" />
      );
    case "intercompany_pending":
      return (
        <div className="h-full flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {(data.ic_pending_count as number) ?? 0} pendentes
            </span>
            <span className="text-xs text-gray-400">período {filters.month}/{filters.year}</span>
          </div>
          <div className="flex-1 overflow-auto space-y-1.5">
            {((data.ic_items as Array<Record<string, unknown>>) ?? []).slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-gray-700">{item.source_company as string} → {item.target_company as string}</p>
                  <p className="text-xs text-gray-400 capitalize">{item.ic_type as string}</p>
                </div>
                <span className="text-xs font-semibold text-amber-600">
                  {fmt(item.amount as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    case "agent_digest":
      return (
        <div className="h-full flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Executadas", value: (data.total_actions as number) ?? 0, color: "text-emerald-600" },
              { label: "Pendentes",  value: (data.pending_approvals as number) ?? 0, color: "text-amber-500" },
              { label: "Revertidas", value: (data.reverted as number) ?? 0, color: "text-red-500" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {((data.highlights as Array<Record<string, unknown>>) ?? []).slice(0, 3).map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Activity size={12} className="mt-0.5 text-blue-400 flex-shrink-0" />
                <span className="text-gray-600 leading-tight">{h.action as string} — {h.agent as string}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "budget_variance":
      return (
        <div className="h-full flex flex-col gap-2">
          {((data.budget_lines as Array<Record<string, unknown>>) ?? [
            { name: "Receitas",   actual: 85000, budget: 80000 },
            { name: "Custos",     actual: 32000, budget: 30000 },
            { name: "Despesas",   actual: 28000, budget: 25000 },
          ]).slice(0, 4).map((line) => {
            const variance = ((line.actual as number) / Math.max((line.budget as number), 1) - 1) * 100;
            return (
              <div key={line.name as string} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20 truncate">{line.name as string}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${variance > 5 ? "bg-red-400" : variance < -5 ? "bg-emerald-400" : "bg-blue-400"}`}
                    style={{ width: `${Math.min(100, ((line.actual as number) / Math.max((line.budget as number), 1)) * 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium w-12 text-right ${variance > 5 ? "text-red-500" : variance < -5 ? "text-emerald-600" : "text-gray-600"}`}>
                  {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      );
    default:
      return (
        <div className="h-full flex items-center justify-center text-gray-300 text-sm">
          {BLOCK_LIBRARY[type]?.title ?? type}
        </div>
      );
  }
}

// ─── Bloco Drag ───────────────────────────────────────

function DashboardBlockCard({
  block, filters, data, onRemove, onToggle,
}: {
  block: DashboardBlock;
  filters: GlobalFilters;
  data: Record<string, unknown>;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const meta = BLOCK_LIBRARY[block.type];

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 transition-all duration-200 ${!block.visible ? "opacity-40" : ""}`}
      style={{ minHeight: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-300 cursor-grab" />
          <span className="text-sm font-medium text-gray-700">{block.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(block.id)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {block.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button
            onClick={() => onRemove(block.id)}
            className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      {/* Content */}
      {block.visible && (
        <div className="flex-1">
          <BlockContent type={block.type} filters={filters} data={data} />
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────

export default function GroupDashboard() {
  const { user } = useAuth();

  // Filtros globais persistentes
  const [filters, setFilters] = useState<GlobalFilters>({
    company_id: null,
    group_id:   null,
    year:       new Date().getFullYear(),
    month:      new Date().getMonth() + 1,
    scenario:   "actual",
    currency:   "BRL",
  });

  const [viewMode, setViewMode] = useState<ViewMode>("consolidated");
  const [blocks, setBlocks]     = useState<DashboardBlock[]>([
    { id: "1", type: "kpi_cash",             title: "Saldo em Caixa",       col: 1, row: 1, visible: true },
    { id: "2", type: "kpi_ar",               title: "A Receber",            col: 2, row: 1, visible: true },
    { id: "3", type: "kpi_ap",               title: "A Pagar",              col: 1, row: 2, visible: true },
    { id: "4", type: "kpi_revenue",          title: "Receita do Período",   col: 2, row: 2, visible: true },
    { id: "5", type: "intercompany_pending", title: "Intercompany",         col: 1, row: 3, visible: true },
    { id: "6", type: "agent_digest",         title: "Agentes IA",           col: 2, row: 3, visible: true },
    { id: "7", type: "budget_variance",      title: "Variação Orçamentária",col: 1, row: 4, visible: true },
    { id: "8", type: "kpi_result",           title: "Resultado",            col: 2, row: 4, visible: true },
  ]);

  const [showLibrary, setShowLibrary] = useState(false);
  const [loading, setLoading]         = useState(false);

  // Mock data — em produção, viria de Supabase via useQuery
  const mockData: Record<string, unknown> = {
    cash_balance: 487250,
    ar_total: 234180, ar_overdue_count: 12,
    ap_total: 189450, ap_next30: 76000,
    revenue_actual: 312000, revenue_budget: 290000,
    net_result: 68200, result_trend: 8.4,
    ic_pending_count: 3,
    ic_items: [
      { source_company: "VirtruvIA SP",    target_company: "VirtruvIA RJ", ic_type: "sale",    amount: 45000 },
      { source_company: "VirtruvIA RJ",    target_company: "VirtruvIA SP", ic_type: "service", amount: 12000 },
      { source_company: "VirtruvIA Matriz",target_company: "VirtruvIA SP", ic_type: "loan",    amount: 100000 },
    ],
    total_actions: 127, pending_approvals: 4, reverted: 1,
    highlights: [
      { agent: "AP",   action: "12 NFs classificadas automaticamente" },
      { agent: "AR",   action: "Régua de cobrança enviou 8 lembretes" },
      { agent: "Conciliação", action: "23 lançamentos conciliados (97% conf.)" },
    ],
  };

  const removeBlock = useCallback((id: string) =>
    setBlocks((b) => b.filter((bl) => bl.id !== id)), []);

  const toggleBlock = useCallback((id: string) =>
    setBlocks((b) => b.map((bl) => bl.id === id ? { ...bl, visible: !bl.visible } : bl)), []);

  const addBlock = useCallback((type: BlockType) => {
    const meta = BLOCK_LIBRARY[type];
    const maxRow = Math.max(...blocks.map((b) => b.row), 0);
    const existingCols = blocks.filter((b) => b.row === maxRow + 1).map((b) => b.col);
    const col = existingCols.includes(1) ? 2 : 1;
    setBlocks((b) => [
      ...b,
      { id: Date.now().toString(), type, title: meta.title, col, row: maxRow + 1, visible: true },
    ]);
    setShowLibrary(false);
  }, [blocks]);

  const VIEW_MODES: { key: ViewMode; label: string; icon: React.ElementType }[] = [
    { key: "single",       label: "Empresa",    icon: Building },
    { key: "consolidated", label: "Consolidado",icon: Globe },
    { key: "comparative",  label: "Comparativo",icon: Layers },
    { key: "cross_lens",   label: "Lente Cruzada",icon: Eye },
  ];

  // Organiza blocos em 2 colunas
  const col1 = blocks.filter((b) => b.col === 1).sort((a, b) => a.row - b.row);
  const col2 = blocks.filter((b) => b.col === 2).sort((a, b) => a.row - b.row);

  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Filtros Globais ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* View mode */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              {VIEW_MODES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    viewMode === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-gray-200" />

            {/* Período */}
            <div className="flex items-center gap-2">
              <select
                value={filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, month: +e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={filters.year}
                onChange={(e) => setFilters((f) => ({ ...f, year: +e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Cenário */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              {(["actual","budget","forecast"] as Scenario[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilters((f) => ({ ...f, scenario: s }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    filters.scenario === s
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {s === "actual" ? "Real" : s === "budget" ? "Orçado" : "Forecast"}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setLoading(true)}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={13} />
                Adicionar Bloco
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Biblioteca de Blocos ── */}
        {showLibrary && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Biblioteca de Blocos</h3>
              <button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(Object.entries(BLOCK_LIBRARY) as [BlockType, typeof BLOCK_LIBRARY[BlockType]][]).map(([type, meta]) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <meta.icon size={16} className="mt-0.5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{meta.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{meta.description}</p>
                    <span className="inline-block mt-1 text-xs text-gray-300">{meta.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Header da visão ── */}
        <div className="flex items-center gap-3 mb-5">
          {viewMode === "consolidated" && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <Globe size={14} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Visão Consolidada do Grupo</span>
              <span className="text-xs text-blue-400 ml-1">• eliminações IC aplicadas</span>
            </div>
          )}
          {viewMode === "comparative" && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
              <Layers size={14} className="text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Visão Comparativa entre Empresas</span>
            </div>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {months[filters.month - 1]} {filters.year} · {filters.scenario === "actual" ? "Real" : filters.scenario === "budget" ? "Orçado" : "Forecast"}
          </span>
        </div>

        {/* ── Grid 2 colunas ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            {col1.map((block) => (
              <DashboardBlockCard
                key={block.id} block={block}
                filters={filters} data={mockData}
                onRemove={removeBlock} onToggle={toggleBlock}
              />
            ))}
          </div>
          <div className="space-y-4">
            {col2.map((block) => (
              <DashboardBlockCard
                key={block.id} block={block}
                filters={filters} data={mockData}
                onRemove={removeBlock} onToggle={toggleBlock}
              />
            ))}
          </div>
        </div>

        {blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BarChart3 size={40} className="text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Nenhum bloco adicionado</p>
            <button
              onClick={() => setShowLibrary(true)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Adicionar primeiro bloco
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
