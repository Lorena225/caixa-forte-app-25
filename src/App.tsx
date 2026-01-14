import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import BancosReferencia from "./pages/cadastros/BancosReferencia";
import Agencias from "./pages/cadastros/Agencias";
import ContasBancarias from "./pages/cadastros/ContasBancarias";
import Dimensoes from "./pages/cadastros/Dimensoes";
import Produtos from "./pages/cadastros/Produtos";
import Servicos from "./pages/cadastros/Servicos";
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
// Vendas Module
import VendasIndex from "./pages/vendas/Index";
import VendasNova from "./pages/vendas/NovaVenda";
import VendasPedidos from "./pages/vendas/Pedidos";
import VendasOrcamentos from "./pages/vendas/Orcamentos";
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
import TesourariaCompensacao from "./pages/tesouraria/Compensacao";
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
import TesourariaCNAB from "./pages/tesouraria/CNAB";
import TesourariaCNABRemessa from "./pages/tesouraria/CNABRemessa";
import TesourariaCNABRetorno from "./pages/tesouraria/CNABRetorno";
import TesourariaBoletos from "./pages/tesouraria/Boletos";
import TesourariaCards from "./pages/tesouraria/CardsManagement";
import TesourariaContratos from "./pages/tesouraria/Contratos";
import TesourariaContratoDetalhe from "./pages/tesouraria/ContratoDetalhe";
import TesourariaContratoNovo from "./pages/tesouraria/ContratoNovo";
import ConciliacaoIndex from "./pages/conciliacao/Index";

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
                
                {/* ERP Modules - Contabilidade */}
                <Route path="/contabilidade" element={<ContabilidadeIndex />} />
                <Route path="/contabilidade/lancamentos" element={<ContabilidadeLancamentos />} />
                <Route path="/contabilidade/balancete" element={<ContabilidadeBalancete />} />
                <Route path="/contabilidade/diario" element={<ContabilidadeDiario />} />
                <Route path="/contabilidade/razao" element={<ContabilidadeRazao />} />
                <Route path="/contabilidade/balanco" element={<ContabilidadeBalanco />} />
                <Route path="/contabilidade/dre" element={<ContabilidadeDREContabil />} />
                <Route path="/contabilidade/fechamento" element={<ContabilidadeFechamento />} />
                
                {/* ERP Modules - Fiscal */}
                <Route path="/fiscal" element={<FiscalIndex />} />
                <Route path="/fiscal/documentos" element={<FiscalDocumentos />} />
                <Route path="/fiscal/sped" element={<FiscalSPED />} />
                <Route path="/fiscal/retencoes" element={<FiscalRetencoes />} />
                <Route path="/fiscal/apuracao" element={<FiscalApuracao />} />
                <Route path="/fiscal/regras" element={<FiscalRegras />} />
                <Route path="/fiscal/obrigacoes" element={<FiscalObrigacoes />} />
                <Route path="/fiscal/empresa" element={<FiscalEmpresa />} />
                
{/* ERP Modules - Tesouraria */}
                <Route path="/tesouraria" element={<TesourariaIndex />} />
                <Route path="/tesouraria/posicao" element={<TesourariaPosicao />} />
                <Route path="/tesouraria/conciliacao" element={<TesourariaConciliacao />} />
                <Route path="/tesouraria/bordero" element={<TesourariaBordero />} />
                <Route path="/tesouraria/compensacao" element={<TesourariaCompensacao />} />
                <Route path="/tesouraria/extratos" element={<TesourariaExtratos />} />
                <Route path="/tesouraria/cnab" element={<TesourariaCNAB />} />
                <Route path="/tesouraria/cnab-remessa" element={<TesourariaCNABRemessa />} />
                <Route path="/tesouraria/cnab-retorno" element={<TesourariaCNABRetorno />} />
                <Route path="/tesouraria/boletos" element={<TesourariaBoletos />} />
                <Route path="/tesouraria/cartoes" element={<TesourariaCards />} />
                <Route path="/tesouraria/contratos" element={<TesourariaContratos />} />
                <Route path="/tesouraria/contratos/novo" element={<TesourariaContratoNovo />} />
                <Route path="/tesouraria/contratos/:id" element={<TesourariaContratoDetalhe />} />
                
                {/* Conciliação Bancária */}
                <Route path="/conciliacao" element={<ConciliacaoIndex />} />
                
                {/* ============ VENDAS ============ */}
                <Route path="/vendas" element={<VendasIndex />} />
                <Route path="/vendas/nova" element={<VendasNova />} />
                <Route path="/vendas/pedidos" element={<VendasPedidos />} />
                <Route path="/vendas/orcamentos" element={<VendasOrcamentos />} />
                
                {/* AP/AR Index */}
                <Route path="/ap" element={<APIndex />} />
                <Route path="/ar" element={<ARIndex />} />
                
                {/* ============ PAINÉIS (PT-BR) ============ */}
                <Route path="/paineis" element={<DashboardsIndex />} />
                <Route path="/paineis/executivo" element={<ExecutiveDashboard />} />
                <Route path="/paineis/fluxo-caixa" element={<CashFlowDashboard />} />
                <Route path="/paineis/contas-receber" element={<ARDashboard />} />
                <Route path="/paineis/contas-pagar" element={<APDashboard />} />
                <Route path="/paineis/orcamento" element={<BudgetDashboard />} />
                <Route path="/paineis/conta-orcamentaria" element={<BudgetByAccountDashboard />} />
                
                {/* Redirects de rotas antigas (inglês) para novas (português) */}
                <Route path="/dashboards" element={<Navigate to="/paineis" replace />} />
                <Route path="/dashboards/executive" element={<Navigate to="/paineis/executivo" replace />} />
                <Route path="/dashboards/executivo" element={<Navigate to="/paineis/executivo" replace />} />
                <Route path="/dashboards/cashflow" element={<Navigate to="/paineis/fluxo-caixa" replace />} />
                <Route path="/dashboards/fluxo-caixa" element={<Navigate to="/paineis/fluxo-caixa" replace />} />
                <Route path="/dashboards/ar" element={<Navigate to="/paineis/contas-receber" replace />} />
                <Route path="/dashboards/ap" element={<Navigate to="/paineis/contas-pagar" replace />} />
                <Route path="/dashboards/budget" element={<Navigate to="/paineis/orcamento" replace />} />
                <Route path="/dashboards/budget-account" element={<Navigate to="/paineis/conta-orcamentaria" replace />} />
                <Route path="/dashboards/budget-accounts" element={<Navigate to="/paineis/conta-orcamentaria" replace />} />
                
                {/* Cadastros */}
                <Route path="/cadastros/plano-contas" element={<PlanoContas />} />
                <Route path="/cadastros/centros-custo" element={<CentrosCusto />} />
                <Route path="/cadastros/clientes-fornecedores" element={<ClientesFornecedores />} />
                <Route path="/cadastros/carteiras" element={<Carteiras />} />
                <Route path="/cadastros/dimensoes" element={<Dimensoes />} />
                <Route path="/cadastros/bancos" element={<BancosReferencia />} />
                <Route path="/cadastros/agencias" element={<Agencias />} />
                <Route path="/cadastros/contas-bancarias" element={<ContasBancarias />} />
                <Route path="/cadastros/produtos" element={<Produtos />} />
                <Route path="/cadastros/servicos" element={<Servicos />} />
                
                {/* ============ INTEGRAÇÕES ============ */}
                <Route path="/integracoes" element={<IntegracoesIndex />} />
                <Route path="/integracoes/importar" element={<IntegracoesImportar />} />
                <Route path="/integracoes/conciliacao" element={<IntegracoesConciliacao />} />
                <Route path="/integracoes/configurar" element={<IntegracoesConfigurar />} />
                <Route path="/integracoes/logs" element={<IntegracoesLogs />} />
                <Route path="/integracoes/conexoes" element={<IntegracoesConnections />} />
                <Route path="/integracoes/jobs" element={<IntegracoesJobs />} />
                <Route path="/integracoes/logs-enterprise" element={<IntegracoesEnterpriseLogs />} />
                <Route path="/integracoes/dlq" element={<IntegracoesDLQ />} />
                <Route path="/integracoes/ia" element={<IAConfig />} />
                <Route path="/integracoes/ia-teste" element={<IATest />} />
                
                {/* Redirects integrações antigas */}
                <Route path="/integracoes/connections" element={<Navigate to="/integracoes/conexoes" replace />} />
                <Route path="/integracoes/enterprise-logs" element={<Navigate to="/integracoes/logs-enterprise" replace />} />
                <Route path="/integracoes/ia-test" element={<Navigate to="/integracoes/ia-teste" replace />} />
                
                {/* Importar/Exportar */}
                <Route path="/importar-exportar" element={<ImportExportIndex />} />
                <Route path="/importar-exportar/wizard" element={<ImportWizard />} />
                <Route path="/importar-exportar/historico" element={<ImportHistory />} />
                <Route path="/importar-exportar/exportar" element={<ExportData />} />
                
                {/* ============ RELATÓRIOS ============ */}
                <Route path="/relatorios" element={<ReportsIndex />} />
                <Route path="/relatorios/drilldown" element={<DrilldownPage />} />
                
                {/* Redirects reports */}
                <Route path="/reports" element={<Navigate to="/relatorios" replace />} />
                <Route path="/reports/drilldown" element={<Navigate to="/relatorios/drilldown" replace />} />
                
                {/* ============ ADMINISTRAÇÃO (PT-BR) ============ */}
                <Route path="/admin" element={<AdminIndex />} />
                <Route path="/admin/empresa" element={<AdminCompany />} />
                <Route path="/admin/filiais" element={<AdminBranches />} />
                <Route path="/admin/usuarios" element={<AdminUsers />} />
                <Route path="/admin/permissoes" element={<AdminPermissions />} />
                <Route path="/admin/fiscal" element={<AdminFiscal />} />
                <Route path="/admin/periodos-fiscais" element={<AdminFiscalPeriods />} />
                <Route path="/admin/tipos-documento" element={<AdminDocumentTypes />} />
                <Route path="/admin/aprovacoes" element={<AdminApprovals />} />
                <Route path="/admin/marca" element={<AdminBranding />} />
                <Route path="/admin/nivel-sistema" element={<AdminSystemTier />} />
                <Route path="/admin/seguranca" element={<AdminSecurity />} />
                <Route path="/admin/painel-seguranca" element={<AdminSecurityDashboard />} />
                <Route path="/admin/logs-auditoria" element={<AdminAuditLogs />} />
                <Route path="/admin/regras-sod" element={<AdminSoDRules />} />
                <Route path="/admin/limites-usuario" element={<AdminUserLimits />} />
                <Route path="/admin/saude-sistema" element={<AdminSystemHealth />} />
                <Route path="/admin/monitor-jobs" element={<AdminJobsMonitor />} />
                <Route path="/admin/go-live" element={<AdminGoLive />} />
                <Route path="/admin/navegacao" element={<AdminNavigationSettings />} />
                
                {/* Redirects admin antigas (inglês) */}
                <Route path="/admin/company" element={<Navigate to="/admin/empresa" replace />} />
                <Route path="/admin/branches" element={<Navigate to="/admin/filiais" replace />} />
                <Route path="/admin/users" element={<Navigate to="/admin/usuarios" replace />} />
                <Route path="/admin/permissions" element={<Navigate to="/admin/permissoes" replace />} />
                <Route path="/admin/fiscal-periods" element={<Navigate to="/admin/periodos-fiscais" replace />} />
                <Route path="/admin/document-types" element={<Navigate to="/admin/tipos-documento" replace />} />
                <Route path="/admin/approvals" element={<Navigate to="/admin/aprovacoes" replace />} />
                <Route path="/admin/branding" element={<Navigate to="/admin/marca" replace />} />
                <Route path="/admin/system-tier" element={<Navigate to="/admin/nivel-sistema" replace />} />
                <Route path="/admin/security" element={<Navigate to="/admin/seguranca" replace />} />
                <Route path="/admin/security-dashboard" element={<Navigate to="/admin/painel-seguranca" replace />} />
                <Route path="/admin/audit-logs" element={<Navigate to="/admin/logs-auditoria" replace />} />
                <Route path="/admin/sod-rules" element={<Navigate to="/admin/regras-sod" replace />} />
                <Route path="/admin/user-limits" element={<Navigate to="/admin/limites-usuario" replace />} />
                <Route path="/admin/system-health" element={<Navigate to="/admin/saude-sistema" replace />} />
                <Route path="/admin/jobs-monitor" element={<Navigate to="/admin/monitor-jobs" replace />} />
                <Route path="/admin/navigation" element={<Navigate to="/admin/navegacao" replace />} />
                
                {/* ============ AUTOPILOTO (PT-BR) ============ */}
                <Route path="/autopiloto/caixa-entrada" element={<Inbox />} />
                <Route path="/autopiloto/pendente" element={<PendingCenter />} />
                <Route path="/autopiloto/regras" element={<AutomationRules />} />
                <Route path="/autopiloto/whatsapp" element={<WhatsAppConfig />} />
                
                {/* Redirects autopilot antigas */}
                <Route path="/autopilot/inbox" element={<Navigate to="/autopiloto/caixa-entrada" replace />} />
                <Route path="/autopilot/pending" element={<Navigate to="/autopiloto/pendente" replace />} />
                <Route path="/autopilot/rules" element={<Navigate to="/autopiloto/regras" replace />} />
                <Route path="/autopilot/whatsapp" element={<Navigate to="/autopiloto/whatsapp" replace />} />
                
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