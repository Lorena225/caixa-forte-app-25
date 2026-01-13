import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
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
import TesourariaCNAB from "./pages/tesouraria/CNAB";
import TesourariaBoletos from "./pages/tesouraria/Boletos";
import TesourariaCards from "./pages/tesouraria/CardsManagement";

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/tesouraria" element={<TesourariaIndex />} />
              <Route path="/tesouraria/posicao" element={<TesourariaPosicao />} />
              <Route path="/tesouraria/conciliacao" element={<TesourariaConciliacao />} />
              <Route path="/tesouraria/bordero" element={<TesourariaBordero />} />
              <Route path="/tesouraria/extratos" element={<TesourariaExtratos />} />
              <Route path="/ap" element={<APIndex />} />
              <Route path="/ar" element={<ARIndex />} />
              {/* Dashboards */}
              <Route path="/dashboards" element={<DashboardsIndex />} />
              <Route path="/dashboards/executivo" element={<ExecutiveDashboard />} />
              <Route path="/dashboards/executive" element={<ExecutiveDashboard />} />
              <Route path="/dashboards/fluxo-caixa" element={<CashFlowDashboard />} />
              <Route path="/dashboards/cash" element={<CashFlowDashboard />} />
              <Route path="/dashboards/ar" element={<ARDashboard />} />
              <Route path="/dashboards/ap" element={<APDashboard />} />
              <Route path="/dashboards/budget" element={<BudgetDashboard />} />
              <Route path="/dashboards/budget-accounts" element={<BudgetByAccountDashboard />} />
              {/* Reports */}
              <Route path="/reports" element={<ReportsIndex />} />
              <Route path="/reports/drilldown" element={<DrilldownPage />} />
              {/* Autopilot */}
              <Route path="/autopilot/whatsapp" element={<WhatsAppConfig />} />
              <Route path="/autopilot/whatsapp-config" element={<WhatsAppConfig />} />
              <Route path="/autopilot/regras" element={<AutomationRules />} />
              <Route path="/autopilot/rules" element={<AutomationRules />} />
              <Route path="/autopilot/pendencias" element={<PendingCenter />} />
              <Route path="/autopilot/pending" element={<PendingCenter />} />
              <Route path="/autopilot/inbox" element={<Inbox />} />
              {/* Integrations */}
              <Route path="/integracoes" element={<IntegracoesIndex />} />
              <Route path="/integracoes/ia" element={<IAConfig />} />
              <Route path="/integracoes/ia-config" element={<IAConfig />} />
              <Route path="/integracoes/ia/testar" element={<IATest />} />
              <Route path="/integracoes/connections" element={<IntegracoesConnections />} />
              <Route path="/integracoes/jobs" element={<IntegracoesJobs />} />
              <Route path="/integracoes/enterprise-logs" element={<IntegracoesEnterpriseLogs />} />
              <Route path="/integracoes/dlq" element={<IntegracoesDLQ />} />
              <Route path="/integracoes/:integrationId/importar" element={<IntegracoesImportar />} />
              <Route path="/integracoes/:integrationId/configurar" element={<IntegracoesConfigurar />} />
              <Route path="/integracoes/conciliacao" element={<IntegracoesConciliacao />} />
              <Route path="/integracoes/logs" element={<IntegracoesLogs />} />
              <Route path="/importar-exportar" element={<ImportExportIndex />} />
              <Route path="/importar-exportar/importar/:entity" element={<ImportWizard />} />
              <Route path="/importar-exportar/historico" element={<ImportHistory />} />
              <Route path="/importar-exportar/exportar/:type" element={<ExportData />} />
              <Route path="/importar-exportar/exportar/report/:report" element={<ExportData />} />
              <Route path="/cadastros/plano-contas" element={<PlanoContas />} />
              <Route path="/cadastros/centros-custo" element={<CentrosCusto />} />
              <Route path="/cadastros/clientes-fornecedores" element={<ClientesFornecedores />} />
              <Route path="/cadastros/carteiras" element={<Carteiras />} />
              <Route path="/cadastros/dimensoes" element={<Dimensoes />} />
              {/* Admin */}
              <Route path="/admin" element={<AdminIndex />} />
              <Route path="/admin/branding" element={<AdminBranding />} />
              <Route path="/admin/usuarios" element={<AdminUsers />} />
              <Route path="/admin/permissoes" element={<AdminPermissions />} />
              <Route path="/admin/filiais" element={<AdminBranches />} />
              <Route path="/admin/aprovacoes" element={<AdminApprovals />} />
              <Route path="/admin/fiscal" element={<AdminFiscal />} />
              <Route path="/admin/seguranca" element={<AdminSecurity />} />
              <Route path="/admin/empresa" element={<AdminCompany />} />
              <Route path="/admin/tipos-documento" element={<AdminDocumentTypes />} />
              <Route path="/admin/periodos-fiscais" element={<AdminFiscalPeriods />} />
              <Route path="/admin/sod" element={<AdminSoDRules />} />
              <Route path="/admin/limites" element={<AdminUserLimits />} />
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
);

export default App;
