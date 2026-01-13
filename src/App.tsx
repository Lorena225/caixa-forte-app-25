import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PlanoContas from "./pages/cadastros/PlanoContas";
import CentrosCusto from "./pages/cadastros/CentrosCusto";
import ClientesFornecedores from "./pages/cadastros/ClientesFornecedores";
import Carteiras from "./pages/cadastros/Carteiras";
import Dimensoes from "./pages/cadastros/Dimensoes";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import FluxoCaixa from "./pages/FluxoCaixa";
import DRE from "./pages/DRE";
import Metas from "./pages/Metas";
import Cartoes from "./pages/Cartoes";
import Lancamentos from "./pages/Lancamentos";
import IntegracoesIndex from "./pages/integracoes/Index";
import IntegracoesImportar from "./pages/integracoes/Importar";
import IntegracoesConciliacao from "./pages/integracoes/Conciliacao";
import IntegracoesConfigurar from "./pages/integracoes/Configurar";
import IntegracoesLogs from "./pages/integracoes/Logs";
import IntegracoesConnections from "./pages/integracoes/Connections";
import IntegracoesJobs from "./pages/integracoes/Jobs";
import IntegracoesEnterpriseLogs from "./pages/integracoes/EnterpriseLogs";
import IntegracoesDLQ from "./pages/integracoes/DLQ";
import IAConfig from "./pages/integracoes/IAConfig";
import IATest from "./pages/integracoes/IATest";
import ImportExportIndex from "./pages/importar-exportar/Index";
import ImportWizard from "./pages/importar-exportar/ImportWizard";
import ImportHistory from "./pages/importar-exportar/ImportHistory";
import ExportData from "./pages/importar-exportar/ExportData";
// ERP Modules
import ContabilidadeIndex from "./pages/contabilidade/Index";
import ContabilidadeLancamentos from "./pages/contabilidade/Lancamentos";
import ContabilidadeBalancete from "./pages/contabilidade/Balancete";
import ContabilidadeDiario from "./pages/contabilidade/Diario";
import ContabilidadeRazao from "./pages/contabilidade/Razao";
import ContabilidadeBalanco from "./pages/contabilidade/Balanco";
import ContabilidadeDREContabil from "./pages/contabilidade/DREContabil";
import ContabilidadeFechamento from "./pages/contabilidade/Fechamento";
import FiscalIndex from "./pages/fiscal/Index";
import FiscalDocumentos from "./pages/fiscal/Documentos";
import FiscalSPED from "./pages/fiscal/SPED";
import FiscalRetencoes from "./pages/fiscal/Retencoes";
import FiscalApuracao from "./pages/fiscal/Apuracao";
import FiscalRegras from "./pages/fiscal/Regras";
import FiscalObrigacoes from "./pages/fiscal/Obrigacoes";
import FiscalEmpresa from "./pages/fiscal/Empresa";
import TesourariaIndex from "./pages/tesouraria/Index";
import TesourariaPosicao from "./pages/tesouraria/Posicao";
import TesourariaConciliacao from "./pages/tesouraria/Conciliacao";
import TesourariaBordero from "./pages/tesouraria/Bordero";
import TesourariaExtratos from "./pages/tesouraria/Extratos";
import APIndex from "./pages/ap/Index";
import ARIndex from "./pages/ar/Index";
// Dashboards
import DashboardsIndex from "./pages/dashboards/Index";
import ExecutiveDashboard from "./pages/dashboards/ExecutiveDashboard";
import CashFlowDashboard from "./pages/dashboards/CashFlowDashboard";
import ARDashboard from "./pages/dashboards/ARDashboard";
import APDashboard from "./pages/dashboards/APDashboard";
import BudgetDashboard from "./pages/dashboards/BudgetDashboard";
import BudgetByAccountDashboard from "./pages/dashboards/BudgetByAccountDashboard";
// Reports
import ReportsIndex from "./pages/reports/Index";
import DrilldownPage from "./pages/reports/DrilldownPage";
// Autopilot
import WhatsAppConfig from "./pages/autopilot/WhatsAppConfig";
import AutomationRules from "./pages/autopilot/AutomationRules";
import PendingCenter from "./pages/autopilot/PendingCenter";
import Inbox from "./pages/autopilot/Inbox";
// Admin
import AdminIndex from "./pages/admin/Index";
import AdminBranding from "./pages/admin/Branding";
import AdminUsers from "./pages/admin/Users";
import AdminPermissions from "./pages/admin/Permissions";
import AdminBranches from "./pages/admin/Branches";
import AdminApprovals from "./pages/admin/Approvals";
import AdminFiscal from "./pages/admin/Fiscal";
import AdminSecurity from "./pages/admin/Security";
import AdminCompany from "./pages/admin/Company";
import AdminDocumentTypes from "./pages/admin/DocumentTypes";
import AdminFiscalPeriods from "./pages/admin/FiscalPeriods";
import AdminSoDRules from "./pages/admin/SoDRules";
import AdminUserLimits from "./pages/admin/UserLimits";
import AdminJobsMonitor from "./pages/admin/JobsMonitor";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminSecurityDashboard from "./pages/admin/SecurityDashboard";
import AdminSystemHealth from "./pages/admin/SystemHealth";
import AdminGoLive from "./pages/admin/GoLiveChecklist";
import AdminSystemTier from "./pages/admin/SystemTier";
import AdminNavigationSettings from "./pages/admin/NavigationSettings";
import AutopilotInbox from "./pages/autopilot/Inbox";
import AutopilotPending from "./pages/autopilot/PendingCenter";
import AutopilotRules from "./pages/autopilot/AutomationRules";
import AutopilotWhatsApp from "./pages/autopilot/WhatsAppConfig";
import TesourariaCNAB from "./pages/tesouraria/CNAB";
import TesourariaBoletos from "./pages/tesouraria/Boletos";
import TesourariaCards from "./pages/tesouraria/CardsManagement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NavigationProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/lancamentos" element={<Lancamentos />} />
                <Route path="/contas-receber" element={<ContasReceber />} />
                <Route path="/contas-pagar" element={<ContasPagar />} />
                <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
                <Route path="/dre" element={<DRE />} />
                <Route path="/metas" element={<Metas />} />
                <Route path="/cartoes" element={<Cartoes />} />
                {/* ERP Modules */}
                <Route path="/contabilidade" element={<ContabilidadeIndex />} />
                <Route path="/contabilidade/lancamentos" element={<ContabilidadeLancamentos />} />
                <Route path="/contabilidade/balancete" element={<ContabilidadeBalancete />} />
                <Route path="/contabilidade/diario" element={<ContabilidadeDiario />} />
                <Route path="/contabilidade/razao" element={<ContabilidadeRazao />} />
                <Route path="/contabilidade/balanco" element={<ContabilidadeBalanco />} />
                <Route path="/contabilidade/dre" element={<ContabilidadeDREContabil />} />
                <Route path="/contabilidade/fechamento" element={<ContabilidadeFechamento />} />
                <Route path="/fiscal" element={<FiscalIndex />} />
                <Route path="/fiscal/documentos" element={<FiscalDocumentos />} />
                <Route path="/fiscal/sped" element={<FiscalSPED />} />
                <Route path="/fiscal/retencoes" element={<FiscalRetencoes />} />
                <Route path="/fiscal/apuracao" element={<FiscalApuracao />} />
                <Route path="/fiscal/regras" element={<FiscalRegras />} />
                <Route path="/fiscal/obrigacoes" element={<FiscalObrigacoes />} />
                <Route path="/fiscal/empresa" element={<FiscalEmpresa />} />
                <Route path="/tesouraria" element={<TesourariaIndex />} />
                <Route path="/tesouraria/posicao" element={<TesourariaPosicao />} />
                <Route path="/tesouraria/conciliacao" element={<TesourariaConciliacao />} />
                <Route path="/tesouraria/bordero" element={<TesourariaBordero />} />
                <Route path="/tesouraria/extratos" element={<TesourariaExtratos />} />
                <Route path="/ap" element={<APIndex />} />
                <Route path="/ar" element={<ARIndex />} />
                {/* Dashboards */}
                <Route path="/dashboards" element={<DashboardsIndex />} />
                <Route path="/dashboards/executive" element={<ExecutiveDashboard />} />
                <Route path="/dashboards/executivo" element={<ExecutiveDashboard />} />
                <Route path="/dashboards/cashflow" element={<CashFlowDashboard />} />
                <Route path="/dashboards/fluxo-caixa" element={<CashFlowDashboard />} />
                <Route path="/dashboards/ar" element={<ARDashboard />} />
                <Route path="/dashboards/ap" element={<APDashboard />} />
                <Route path="/dashboards/budget" element={<BudgetDashboard />} />
                <Route path="/dashboards/budget-account" element={<BudgetByAccountDashboard />} />
                <Route path="/dashboards/budget-accounts" element={<BudgetByAccountDashboard />} />
                {/* Cadastros */}
                <Route path="/cadastros/plano-contas" element={<PlanoContas />} />
                <Route path="/cadastros/centros-custo" element={<CentrosCusto />} />
                <Route path="/cadastros/clientes-fornecedores" element={<ClientesFornecedores />} />
                <Route path="/cadastros/carteiras" element={<Carteiras />} />
                <Route path="/cadastros/dimensoes" element={<Dimensoes />} />
                {/* Integrações */}
                <Route path="/integracoes" element={<IntegracoesIndex />} />
                <Route path="/integracoes/importar" element={<IntegracoesImportar />} />
                <Route path="/integracoes/conciliacao" element={<IntegracoesConciliacao />} />
                <Route path="/integracoes/configurar" element={<IntegracoesConfigurar />} />
                <Route path="/integracoes/logs" element={<IntegracoesLogs />} />
                <Route path="/integracoes/connections" element={<IntegracoesConnections />} />
                <Route path="/integracoes/jobs" element={<IntegracoesJobs />} />
                <Route path="/integracoes/enterprise-logs" element={<IntegracoesEnterpriseLogs />} />
                <Route path="/integracoes/dlq" element={<IntegracoesDLQ />} />
                <Route path="/integracoes/ia" element={<IAConfig />} />
                <Route path="/integracoes/ia-test" element={<IATest />} />
                {/* Importar/Exportar */}
                <Route path="/importar-exportar" element={<ImportExportIndex />} />
                <Route path="/importar-exportar/wizard" element={<ImportWizard />} />
                <Route path="/importar-exportar/historico" element={<ImportHistory />} />
                <Route path="/importar-exportar/exportar" element={<ExportData />} />
                {/* Reports */}
                <Route path="/reports" element={<ReportsIndex />} />
                <Route path="/reports/drilldown" element={<DrilldownPage />} />
                {/* Admin */}
                <Route path="/admin" element={<AdminIndex />} />
                <Route path="/admin/company" element={<AdminCompany />} />
                <Route path="/admin/branches" element={<AdminBranches />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/permissions" element={<AdminPermissions />} />
                <Route path="/admin/fiscal" element={<AdminFiscal />} />
                <Route path="/admin/fiscal-periods" element={<AdminFiscalPeriods />} />
                <Route path="/admin/document-types" element={<AdminDocumentTypes />} />
                <Route path="/admin/approvals" element={<AdminApprovals />} />
                <Route path="/admin/branding" element={<AdminBranding />} />
                <Route path="/admin/system-tier" element={<AdminSystemTier />} />
                <Route path="/admin/security" element={<AdminSecurity />} />
                <Route path="/admin/security-dashboard" element={<AdminSecurityDashboard />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                <Route path="/admin/sod-rules" element={<AdminSoDRules />} />
                <Route path="/admin/user-limits" element={<AdminUserLimits />} />
                <Route path="/admin/system-health" element={<AdminSystemHealth />} />
                <Route path="/admin/jobs-monitor" element={<AdminJobsMonitor />} />
                <Route path="/admin/go-live" element={<AdminGoLive />} />
                <Route path="/admin/navigation" element={<AdminNavigationSettings />} />
                {/* Autopilot */}
                <Route path="/autopilot/inbox" element={<AutopilotInbox />} />
                <Route path="/autopilot/pending" element={<AutopilotPending />} />
                <Route path="/autopilot/rules" element={<AutopilotRules />} />
                <Route path="/autopilot/whatsapp" element={<AutopilotWhatsApp />} />
                {/* Tesouraria Extended */}
                <Route path="/tesouraria/cnab" element={<TesourariaCNAB />} />
                <Route path="/tesouraria/boletos" element={<TesourariaBoletos />} />
                <Route path="/tesouraria/cartoes" element={<TesourariaCards />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </NavigationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
