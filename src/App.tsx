import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Documentacao from "./pages/Documentacao";
import Favoritos from "./pages/Favoritos";
import FrenteCaixa from "./pages/FrenteCaixa";
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
import Metas from "./pages/MetasOrcamentarias";
import MetasFinanceiras from "./pages/MetasFinanceiras";
import Cartoes from "./pages/Cartoes";
import Lancamentos from "./pages/Lancamentos";
import IntegracoesIndex from "./pages/integracoes/Index";
import GoogleIntegracao from "./pages/integracoes/GoogleIntegracao";
import GoogleCallback from "./pages/integracoes/GoogleCallback";
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
// Developer Portal & Marketplace
import DeveloperPortal from "./pages/developers/Index";
import Marketplace from "./pages/marketplace/Index";
import APIDocs from "./pages/api/docs";
import APIKeysPage from "./pages/settings/APIKeys";
import SettingsGovernancePage from "./pages/configuracoes/SettingsGovernancePage";
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
import FiscalNFe from "./pages/fiscal/NFe";
import FiscalNFSe from "./pages/fiscal/NFSe";
import FiscalCertificados from "./pages/fiscal/Certificados";
import FiscalSpedFiscal from "./pages/fiscal/SpedFiscal";
import FiscalSpedContabil from "./pages/fiscal/SpedContabil";
import FiscalApuracaoImpostos from "./pages/fiscal/ApuracaoImpostos";
import FiscalLivrosFiscais from "./pages/fiscal/LivrosFiscais";
import FiscalObrigacoesAcessorias from "./pages/fiscal/ObrigacoesAcessorias";
// Estoque
import EstoqueIndex from "./pages/estoque/Index";
import EstoqueMovimentacoes from "./pages/estoque/Movimentacoes";
import EstoqueInventario from "./pages/estoque/Inventario";
// Produção / PCP / MRP
import ProducaoIndex from "./pages/producao/Index";
import OrdensProducao from "./pages/producao/OrdensProducao";
import Engenharia from "./pages/producao/Engenharia";
import MRP from "./pages/producao/MRP";
import Apontamento from "./pages/producao/Apontamento";
import CentrosTrabalho from "./pages/producao/CentrosTrabalho";
import Requisicoes from "./pages/producao/Requisicoes";
import Custeio from "./pages/producao/Custeio";
import ChaoFabrica from "./pages/producao/ChaoFabrica";
import ProducaoKanban from "./pages/producao/Kanban";
// Compras
import ComprasIndex from "./pages/compras/Index";
import ComprasPedidos from "./pages/compras/Pedidos";
import ComprasCotacoes from "./pages/compras/Cotacoes";
import ComprasEntradas from "./pages/compras/Entradas";
// Cobrança
import CobrancaIndex from "./pages/cobranca/Index";
import CobrancaBoletos from "./pages/cobranca/Boletos";
import CobrancaReguas from "./pages/cobranca/Reguas";
import CobrancaNegativacao from "./pages/cobranca/Negativacao";
import CobrancaSerasa from "./pages/cobranca/Serasa";
import CobrancaGestaoCredito from "./pages/cobranca/GestaoCredito";
import TesourariaIndex from "./pages/tesouraria/Index";
import TesourariaPosicao from "./pages/tesouraria/Posicao";
import TesourariaConciliacao from "./pages/tesouraria/Conciliacao";
import TesourariaBordero from "./pages/tesouraria/Bordero";
import TesourariaCompensacao from "./pages/tesouraria/Compensacao";
import TesourariaExtratos from "./pages/tesouraria/Extratos";
import APIndex from "./pages/ap/Index";
import APLancamentoNF from "./pages/ap/LancamentoNF";
import APWorkflowAprovacao from "./pages/ap/WorkflowAprovacao";
import APBordero from "./pages/ap/Bordero";
import APAgentAP from "./pages/ap/AgentAP";
import ARIndex from "./pages/ar/Index";
import EmprestimosIndex from "./pages/emprestimos/Index";
import EmprestimosNovo from "./pages/emprestimos/NovoContrato";
import EmprestimosCronograma from "./pages/emprestimos/Cronograma";
import AgentEmprestimos from "./pages/emprestimos/AgentEmprestimos";
import AgenteCaixa from "./pages/ia/AgenteCaixa";
import AREmissaoBoleto from "./pages/ar/EmissaoBoleto";
import ARReguaCobrancaIA from "./pages/ar/ReguaCobrancaIA";
import ARAgentAR from "./pages/ar/AgentAR";
import AgenteConciliacao from "./pages/ia/AgenteConciliacao";
import AgenteAuditor from "./pages/ia/AgenteAuditor";
// Dashboards
import DashboardsIndex from "./pages/dashboards/Index";
import ExecutiveDashboard from "./pages/dashboards/ExecutiveDashboard";
import CashFlowDashboard from "./pages/dashboards/CashFlowDashboard";
import ARDashboard from "./pages/dashboards/ARDashboard";
import APDashboard from "./pages/dashboards/APDashboard";
import BudgetDashboard from "./pages/dashboards/BudgetDashboard";
import BudgetByAccountDashboard from "./pages/dashboards/BudgetByAccountDashboard";
import PoloDashboard from "./pages/dashboards/PoloDashboard";
// Reports
import ReportsIndex from "./pages/reports/Index";
import DrilldownPage from "./pages/reports/DrilldownPage";
// Autopilot
import WhatsAppConfig from "./pages/autopilot/WhatsAppConfig";
import AutomationRules from "./pages/autopilot/AutomationRules";
import PendingCenter from "./pages/autopilot/PendingCenter";
import Inbox from "./pages/autopilot/Inbox";
import Decisoes from "./pages/autopilot/Decisoes";
// IA / ChatGPT Financeiro
import IAIndex from "./pages/ia/Index";
// IAConfiguracoes replaced by AISettingsPage
import IAWhatsAppAgent from "./pages/ia/WhatsAppAgent";
import IAMonitorAlerts from "./pages/ia/MonitorAlerts";
import IAAnalystChat from "./pages/ia/AnalystChat";
import IALogs from "./pages/ia/Logs";
import CFOVirtual from "./pages/ia/CFOVirtual";
// Inovação & Open Finance
import InovacaoIndex from "./pages/inovacao/Index";
import OpenFinanceConexoes from "./pages/openfinance/Conexoes";
import OpenFinancePagamentos from "./pages/openfinance/Pagamentos";
import EmbeddedAntecipacao from "./pages/embedded/Antecipacao";
import EmbeddedServicos from "./pages/embedded/Servicos";
import FinanceiroSimulacoes from "./pages/financeiro/Simulacoes";
import FinanceiroTempoReal from "./pages/financeiro/TempoReal";
import ComplianceAnomalias from "./pages/compliance/Anomalias";
// Financeiro Avançado
import ConciliacaoBancaria from "./pages/financeiro/ConciliacaoBancaria";
import AnaliseCustos from "./pages/financeiro/AnaliseCustos";
import OrcamentoReal from "./pages/financeiro/OrcamentoReal";
import RollingForecast from "./pages/financeiro/RollingForecast";
import SimulacoesOrcamento from "./pages/financeiro/SimulacoesOrcamento";
import Investimentos from "./pages/financeiro/Investimentos";
import FinanceiroPDD from "./pages/financeiro/PDD";
// Orçamento Avançado
import OrcamentoCenarios from "./pages/financeiro/orcamento/Cenarios";
import OrcamentoAprovacoes from "./pages/financeiro/orcamento/Aprovacoes";
import OrcamentoVariancia from "./pages/financeiro/orcamento/Variancia";
import OrcamentoVersoes from "./pages/financeiro/orcamento/Versoes";
import OrcamentoWhatIf from "./pages/financeiro/orcamento/WhatIf";
import Moedas from "./pages/configuracoes/Moedas";
import SettingsUsers from "./pages/settings/Users";
import SettingsRoles from "./pages/settings/Roles";
import SettingsRoleDetail from "./pages/settings/RoleDetail";
import SettingsPermissions from "./pages/settings/Permissions";
import SettingsBackup from "./pages/settings/Backup";
// CRM
import CRMIndex from "./pages/crm/Index";
import CRMPipeline from "./pages/crm/Pipeline";
import CRMLeads from "./pages/crm/Leads";
import CRMVendedores from "./pages/crm/Vendedores";
import CRMComissoes from "./pages/crm/Comissoes";
import CRMMetas from "./pages/crm/Metas";
import SellerCockpit from "./pages/crm/SellerCockpit";
import QuoteBuilder from "./pages/crm/QuoteBuilder";
// Projetos
import GestaoProjetosPage from "./pages/projetos/GestaoProjetosPage";
// Contratos / Recorrência
import RecorrenciaPage from "./pages/contratos/Recorrencia";
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
import AdminAuditCompliance from "./pages/admin/AuditCompliance";
import AdminSecurityDashboard from "./pages/admin/SecurityDashboard";
import AdminSystemHealth from "./pages/admin/SystemHealth";
import AdminGoLive from "./pages/admin/GoLiveChecklist";
import AdminSystemTier from "./pages/admin/SystemTier";
import AdminNavigationSettings from "./pages/admin/NavigationSettings";
import AdminSecurityReport from "./pages/admin/SecurityReport";
import UserManagement from "./pages/admin/UserManagement";
import PerformanceDashboard from "./pages/admin/PerformanceDashboard";
import ModuleMaturityReport from "./pages/admin/ModuleMaturityReport";
// Backup & Recovery
import BackupIndex from "./pages/admin/backup/Index";
import BackupJobs from "./pages/admin/backup/Jobs";
import BackupHistorico from "./pages/admin/backup/Historico";
import BackupPolitica from "./pages/admin/backup/Politica";
import BackupConfiguracoes from "./pages/admin/backup/Configuracoes";
import TesourariaCNAB from "./pages/tesouraria/CNAB";
import TesourariaCNABRemessa from "./pages/tesouraria/CNABRemessa";
import TesourariaCNABRetorno from "./pages/tesouraria/CNABRetorno";
import TesourariaBoletos from "./pages/tesouraria/Boletos";
import TesourariaCards from "./pages/tesouraria/CardsManagement";
import TesourariaContratos from "./pages/tesouraria/Contratos";
import TesourariaContratoDetalhe from "./pages/tesouraria/ContratoDetalhe";
import TesourariaContratoNovo from "./pages/tesouraria/ContratoNovo";
import ConciliacaoIndex from "./pages/conciliacao/Index";
// Gestão Bancária
import TesourariaTransferencias from "./pages/tesouraria/Transferencias";
import TesourariaCheques from "./pages/tesouraria/Cheques";
import TesourariaCaixaFisica from "./pages/tesouraria/CaixaFisica";
// Operacional
import OperacionalIndex from "./pages/operacional/Index";
import EstruturaOrganizacional from "./pages/operacional/EstruturaOrganizacional";
import CentrosCustodia from "./pages/operacional/CentrosCustodia";
import Departamentos from "./pages/operacional/Departamentos";
import Responsaveis from "./pages/operacional/Responsaveis";
// Relatórios expandidos
import BalancoPatrimonial from "./pages/relatorios/BalancoPatrimonial";
import Balancete from "./pages/relatorios/Balancete";
import LivroRazao from "./pages/relatorios/LivroRazao";
import LivroDiario from "./pages/relatorios/LivroDiario";
import ECF from "./pages/relatorios/ECF";
import AnaliseVendas from "./pages/relatorios/AnaliseVendas";
import AnaliseCompras from "./pages/relatorios/AnaliseCompras";
import CentralRelatorios from "./pages/relatorios/Central";
import HistoricoRelatorios from "./pages/relatorios/Historico";
import AgendamentosRelatorios from "./pages/relatorios/Agendamentos";
// Fiscal expandido
import NFCe from "./pages/fiscal/NFCe";
import CupomFiscal from "./pages/fiscal/CupomFiscal";
import DANFE from "./pages/fiscal/DANFE";
import AnaliseFiscal from "./pages/fiscal/AnaliseFiscal";
import EmissorNotas from "./pages/fiscal/EmissorNotas";
import MotorTributario from "./pages/fiscal/MotorTributario";
// Contabil
import Reclassificacao from "./pages/contabilidade/Reclassificacao";
// Automações
import AutomationsIndex from "./pages/automations/Index";
import AutomationDetail from "./pages/automations/AutomationDetail";
// Controladoria & Open Banking
import ComplianceDashboard from "./pages/controladoria/ComplianceDashboard";
import TaxMappingPage from "./pages/controladoria/TaxMappingPage";
import ComplianceAlertsPage from "./pages/controladoria/ComplianceAlertsPage";
import ComplianceAuditPage from "./pages/controladoria/ComplianceAuditPage";
import MapeamentoContabil from "./pages/controladoria/MapeamentoContabil";
import DashboardFiscal from "./pages/controladoria/DashboardFiscal";
import OpenBankingPage from "./pages/openbanking/OpenBankingPage";
import AutomaticReconciliationPage from "./pages/openbanking/AutomaticReconciliationPage";
import NFXMLUploadPage from "./pages/openbanking/NFXMLUploadPage";
import CashComplianceDashboardPage from "./pages/openbanking/CashComplianceDashboardPage";
// Controladoria AI Pages
import { ControladoriaLivroDiarioPage } from "./pages/ControladoriaLivroDiarioPage";
import { ControladoriaDREPage } from "./pages/ControladoriaDREPage";
import { ControladoriaBalancetePage } from "./pages/ControladoriaBalancetePage";
import { ControladoriaBalancoPage } from "./pages/ControladoriaBalancoPage";
// IA Agentes
import IntelligenceFeed from "./pages/ia/IntelligenceFeed";
import AISettingsPage from "./pages/ia/AISettingsPage";
import AnomalyMonitorPage from "./pages/ia/AnomalyMonitorPage";
import DigitalAgentsPage from "./pages/ia/DigitalAgentsPage";
import AIDecisionLogsPage from "./pages/ia/AIDecisionLogsPage";
// HCM & Departamento Pessoal
import HCMIndex from "./pages/hcm/Index";
import HCMColaboradores from "./pages/hcm/Colaboradores";
import HCMIntegracoesPonto from "./pages/hcm/IntegracoesPonto";
import HCMFolhaInteligente from "./pages/hcm/FolhaInteligente";
import HCMPeopleAnalytics from "./pages/hcm/PeopleAnalytics";
import HCMBeneficios from "./pages/hcm/Beneficios";
import HCMSolicitacoes from "./pages/hcm/Solicitacoes";
import HCMHolerites from "./pages/hcm/Holerites";
import HCMBancoHoras from "./pages/hcm/BancoHoras";
import HCMPortalColaborador from "./pages/hcm/PortalColaborador";
import HCMGestorPonto from "./pages/hcm/GestorPonto";
// Novos módulos PRD
import PainelIndividual from "./pages/PainelIndividual";
import GestaoMetas from "./pages/metas/GestaoMetas";
import MapaEstrategico from "./pages/metas/MapaEstrategico";
import InvestigacaoFalhas from "./pages/qualidade/InvestigacaoFalhas";
import GestaoProcessos from "./pages/processos/GestaoProcessos";
import IAOperacional from "./pages/ia/IAOperacional";
import SupplyChainIndex from "./pages/supplychain/Index";
import GroupDashboard from "./pages/grupo/VisaoGeral";
import GrupoEmpresas from "./pages/grupo/Empresas";
import GrupoIntercompany from "./pages/grupo/Intercompany";
import GrupoBalancete from "./pages/grupo/Balancete";
import GrupoDemonstrativos from "./pages/grupo/Demonstrativos";
import GrupoCambio from "./pages/grupo/Cambio";
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
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NavigationProvider>
              <Routes>
                {/* Rotas públicas — sem layout */}
                <Route path="/auth" element={<Auth />} />

                {/* Rotas protegidas — AppLayout garante header+sidebar em todas */}
                <Route element={<AppLayout><Outlet /></AppLayout>}>
                <Route path="/" element={<Index />} />
                <Route path="/favoritos" element={<Favoritos />} />
                <Route path="/frente-caixa" element={<FrenteCaixa />} />
                <Route path="/lancamentos" element={<Lancamentos />} />
                <Route path="/contas-receber" element={<ContasReceber />} />
                <Route path="/contas-pagar" element={<ContasPagar />} />
                <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
                <Route path="/dre" element={<DRE />} />
                <Route path="/metas" element={<Metas />} />
                <Route path="/metas-financeiras" element={<MetasFinanceiras />} />
                <Route path="/cartoes" element={<Cartoes />} />
                
                {/* Settings - Primary paths */}
                <Route path="/settings/usuarios" element={<SettingsUsers />} />
                <Route path="/settings/papeis" element={<SettingsRoles />} />
                <Route path="/settings/papeis/:roleId" element={<SettingsRoleDetail />} />
                <Route path="/settings/permissoes" element={<SettingsPermissions />} />
                <Route path="/settings/backup" element={<SettingsBackup />} />
                
                {/* Settings - Portuguese paths (aliases) */}
                <Route path="/configuracoes" element={<SettingsGovernancePage />} />
                <Route path="/configuracoes/governanca" element={<SettingsGovernancePage />} />
                <Route path="/configuracoes/usuarios" element={<SettingsUsers />} />
                <Route path="/configuracoes/papeis" element={<SettingsRoles />} />
                <Route path="/configuracoes/papeis/:roleId" element={<SettingsRoleDetail />} />
                <Route path="/configuracoes/permissoes" element={<SettingsPermissions />} />
                <Route path="/configuracoes/backup" element={<SettingsBackup />} />
                
                {/* ERP Modules - Contabilidade */}
                <Route path="/contabilidade" element={<ContabilidadeIndex />} />
                <Route path="/contabilidade/lancamentos" element={<ContabilidadeLancamentos />} />
                <Route path="/contabilidade/balancete" element={<ContabilidadeBalancete />} />
                <Route path="/contabilidade/diario" element={<ContabilidadeDiario />} />
                <Route path="/contabilidade/razao" element={<ContabilidadeRazao />} />
                <Route path="/contabilidade/balanco" element={<ContabilidadeBalanco />} />
                <Route path="/contabilidade/dre" element={<ContabilidadeDREContabil />} />
                <Route path="/contabilidade/fechamento" element={<ContabilidadeFechamento />} />
                <Route path="/contabilidade/reclassificacao" element={<Reclassificacao />} />
                {/* ERP Modules - Fiscal */}
                <Route path="/fiscal" element={<FiscalIndex />} />
                <Route path="/fiscal/documentos" element={<FiscalDocumentos />} />
                <Route path="/fiscal/nfe" element={<FiscalNFe />} />
                <Route path="/fiscal/nfse" element={<FiscalNFSe />} />
                <Route path="/fiscal/certificados" element={<FiscalCertificados />} />
                <Route path="/fiscal/sped" element={<FiscalSPED />} />
                <Route path="/fiscal/retencoes" element={<FiscalRetencoes />} />
                <Route path="/fiscal/apuracao" element={<FiscalApuracao />} />
                <Route path="/fiscal/regras" element={<FiscalRegras />} />
                <Route path="/fiscal/obrigacoes" element={<FiscalObrigacoes />} />
                <Route path="/fiscal/empresa" element={<FiscalEmpresa />} />
                <Route path="/fiscal/sped-fiscal" element={<FiscalSpedFiscal />} />
                <Route path="/fiscal/sped-contabil" element={<FiscalSpedContabil />} />
                <Route path="/fiscal/apuracao-impostos" element={<FiscalApuracaoImpostos />} />
                <Route path="/fiscal/livros-fiscais" element={<FiscalLivrosFiscais />} />
                <Route path="/fiscal/obrigacoes-acessorias" element={<FiscalObrigacoesAcessorias />} />
                <Route path="/fiscal/nfce" element={<NFCe />} />
                <Route path="/fiscal/cupom-fiscal" element={<CupomFiscal />} />
                <Route path="/fiscal/danfe" element={<DANFE />} />
                <Route path="/fiscal/analise" element={<AnaliseFiscal />} />
                <Route path="/fiscal/emissor" element={<EmissorNotas />} />
                <Route path="/fiscal/motor-tributario" element={<MotorTributario />} />
                
                {/* ============ CONTROLADORIA AVANÇADA ============ */}
                <Route path="/controladoria/mapeamento-contabil" element={<MapeamentoContabil />} />
                <Route path="/controladoria/dashboard-fiscal" element={<DashboardFiscal />} />
                {/* ============ OPERACIONAL ============ */}
                <Route path="/operacional" element={<OperacionalIndex />} />
                <Route path="/operacional/estrutura" element={<EstruturaOrganizacional />} />
                <Route path="/operacional/centros-custodia" element={<CentrosCustodia />} />
                <Route path="/operacional/departamentos" element={<Departamentos />} />
                <Route path="/operacional/responsaveis" element={<Responsaveis />} />
                
                {/* ============ ESTOQUE ============ */}
                <Route path="/estoque" element={<EstoqueIndex />} />
                <Route path="/estoque/movimentacoes" element={<EstoqueMovimentacoes />} />
                <Route path="/estoque/inventario" element={<EstoqueInventario />} />
                
                {/* ============ COMPRAS ============ */}
                <Route path="/compras" element={<ComprasIndex />} />
                <Route path="/compras/pedidos" element={<ComprasPedidos />} />
                <Route path="/compras/cotacoes" element={<ComprasCotacoes />} />
                <Route path="/compras/entradas" element={<ComprasEntradas />} />
                
                {/* ============ COBRANÇA ============ */}
                <Route path="/cobranca" element={<CobrancaIndex />} />
                <Route path="/cobranca/boletos" element={<CobrancaBoletos />} />
                <Route path="/cobranca/reguas" element={<CobrancaReguas />} />
                <Route path="/cobranca/negativacao" element={<CobrancaNegativacao />} />
                <Route path="/cobranca/serasa" element={<CobrancaSerasa />} />
                <Route path="/cobranca/gestao-credito" element={<CobrancaGestaoCredito />} />
                
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
                <Route path="/tesouraria/transferencias" element={<TesourariaTransferencias />} />
                <Route path="/tesouraria/cheques" element={<TesourariaCheques />} />
                <Route path="/tesouraria/caixa-fisica" element={<TesourariaCaixaFisica />} />
                <Route path="/tesouraria/contratos" element={<TesourariaContratos />} />
                <Route path="/tesouraria/contratos/novo" element={<TesourariaContratoNovo />} />
                <Route path="/tesouraria/contratos/:id" element={<TesourariaContratoDetalhe />} />
                
                {/* Conciliação Bancária */}
                <Route path="/conciliacao" element={<ConciliacaoIndex />} />
                
{/* ============ FINANCEIRO AVANÇADO ============ */}
                <Route path="/financeiro/conciliacao-bancaria" element={<ConciliacaoBancaria />} />
                <Route path="/financeiro/analise-custos" element={<AnaliseCustos />} />
                <Route path="/financeiro/orcamento-real" element={<OrcamentoReal />} />
                <Route path="/financeiro/rolling-forecast" element={<RollingForecast />} />
                <Route path="/financeiro/simulacoes-orcamento" element={<SimulacoesOrcamento />} />
                <Route path="/financeiro/investimentos" element={<Investimentos />} />
                <Route path="/financeiro/pdd" element={<FinanceiroPDD />} />
                
                {/* ============ ORÇAMENTO AVANÇADO ============ */}
                <Route path="/financeiro/orcamento/cenarios" element={<OrcamentoCenarios />} />
                <Route path="/financeiro/orcamento/aprovacoes" element={<OrcamentoAprovacoes />} />
                <Route path="/financeiro/orcamento/variancia" element={<OrcamentoVariancia />} />
                <Route path="/financeiro/orcamento/versoes" element={<OrcamentoVersoes />} />
                <Route path="/financeiro/orcamento/what-if" element={<OrcamentoWhatIf />} />
                
                <Route path="/configuracoes/moedas" element={<Moedas />} />
                
                {/* ============ VENDAS ============ */}
                <Route path="/vendas" element={<VendasIndex />} />
                <Route path="/vendas/nova" element={<VendasNova />} />
                <Route path="/vendas/pedidos" element={<VendasPedidos />} />
                <Route path="/vendas/orcamentos" element={<VendasOrcamentos />} />
                
                {/* ============ PRODUÇÃO / PCP / MRP ============ */}
                <Route path="/producao" element={<ProducaoIndex />} />
                <Route path="/producao/ordens" element={<OrdensProducao />} />
                <Route path="/producao/engenharia" element={<Engenharia />} />
                <Route path="/producao/mrp" element={<MRP />} />
                <Route path="/producao/apontamento" element={<Apontamento />} />
                <Route path="/producao/centros-trabalho" element={<CentrosTrabalho />} />
                <Route path="/producao/requisicoes" element={<Requisicoes />} />
                <Route path="/producao/custeio" element={<Custeio />} />
                <Route path="/producao/chao-fabrica" element={<ChaoFabrica />} />
                <Route path="/producao/kanban" element={<ProducaoKanban />} />
                
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
                <Route path="/paineis/polo" element={<PoloDashboard />} />

                {/* ============ INTELIGÊNCIA (IA) ============ */}
                <Route path="/ia/feed" element={<IntelligenceFeed />} />
                <Route path="/ia/configuracoes" element={<AISettingsPage />} />
                <Route path="/ia/anomalias" element={<AnomalyMonitorPage />} />
                <Route path="/ia/agentes" element={<DigitalAgentsPage />} />
                <Route path="/ia/decisoes-log" element={<AIDecisionLogsPage />} />
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
                <Route path="/integracoes/google" element={<GoogleIntegracao />} />
                <Route path="/google-callback" element={<GoogleCallback />} />
                <Route path="/integracoes/ia-teste" element={<IATest />} />
                
                {/* ============ IA / CHATGPT FINANCEIRO ============ */}
                <Route path="/ia" element={<IAIndex />} />
                <Route path="/ia/whatsapp" element={<IAWhatsAppAgent />} />
                <Route path="/ia/alertas" element={<IAMonitorAlerts />} />
                <Route path="/ia/analista" element={<IAAnalystChat />} />
                <Route path="/ia/logs" element={<IALogs />} />
                <Route path="/ia/cfo-virtual" element={<CFOVirtual />} />
                
                {/* ============ INOVAÇÃO & OPEN FINANCE ============ */}
                <Route path="/inovacao" element={<InovacaoIndex />} />
                <Route path="/openfinance/conexoes" element={<OpenFinanceConexoes />} />
                <Route path="/openfinance/pagamentos" element={<OpenFinancePagamentos />} />
                <Route path="/embedded/antecipacao" element={<EmbeddedAntecipacao />} />
                <Route path="/embedded/servicos" element={<EmbeddedServicos />} />
                <Route path="/financeiro/simulacoes" element={<FinanceiroSimulacoes />} />
                <Route path="/financeiro/tempo-real" element={<FinanceiroTempoReal />} />
                <Route path="/compliance/anomalias" element={<ComplianceAnomalias />} />
                
                {/* ============ CONTROLADORIA & OPEN BANKING ============ */}
                <Route path="/controladoria-obrigacoes" element={<ComplianceDashboard />} />
                <Route path="/controladoria-mapeamento" element={<TaxMappingPage />} />
                <Route path="/controladoria-alertas" element={<ComplianceAlertsPage />} />
                <Route path="/controladoria-auditoria" element={<ComplianceAuditPage />} />
                <Route path="/open-banking" element={<OpenBankingPage />} />
                <Route path="/conciliacao-automatica" element={<AutomaticReconciliationPage />} />
                <Route path="/nf-xml-auto" element={<NFXMLUploadPage />} />
                <Route path="/dashboard-caixa-compliance" element={<CashComplianceDashboardPage />} />
                
                {/* ============ CONTROLADORIA AI ============ */}
                <Route path="/controladoria-livro-diario" element={<ControladoriaLivroDiarioPage />} />
                <Route path="/controladoria-dre" element={<ControladoriaDREPage />} />
                <Route path="/controladoria-balancete" element={<ControladoriaBalancetePage />} />
                <Route path="/controladoria-balanco" element={<ControladoriaBalancoPage />} />
                
                {/* ============ AUTOMAÇÕES ============ */}
                <Route path="/automacoes" element={<AutomationsIndex />} />
                <Route path="/automacoes/nova" element={<AutomationDetail />} />
                <Route path="/automacoes/:id" element={<AutomationDetail />} />
                
                {/* Redirects integrações antigas */}
                <Route path="/integracoes/connections" element={<Navigate to="/integracoes/conexoes" replace />} />
                <Route path="/integracoes/enterprise-logs" element={<Navigate to="/integracoes/logs-enterprise" replace />} />
                <Route path="/integracoes/ia-test" element={<Navigate to="/integracoes/ia-teste" replace />} />
                
                {/* Importar/Exportar */}
                <Route path="/importar-exportar" element={<ImportExportIndex />} />
                <Route path="/importar-exportar/wizard" element={<ImportWizard />} />
                <Route path="/importar-exportar/importar/:entity" element={<ImportWizard />} />
                <Route path="/importar-exportar/exportar/:entity" element={<ExportData />} />
                <Route path="/importar-exportar/exportar/report/:report" element={<ExportData />} />
                <Route path="/importar-exportar/historico" element={<ImportHistory />} />
                <Route path="/importar-exportar/exportar" element={<ExportData />} />
                
                {/* ============ RELATÓRIOS ============ */}
                <Route path="/relatorios" element={<ReportsIndex />} />
                <Route path="/relatorios/central" element={<CentralRelatorios />} />
                <Route path="/relatorios/historico" element={<HistoricoRelatorios />} />
                <Route path="/relatorios/agendamentos" element={<AgendamentosRelatorios />} />
                <Route path="/relatorios/drilldown" element={<DrilldownPage />} />
                <Route path="/relatorios/balanco" element={<BalancoPatrimonial />} />
                <Route path="/relatorios/balancete" element={<Balancete />} />
                <Route path="/relatorios/livro-razao" element={<LivroRazao />} />
                <Route path="/relatorios/livro-diario" element={<LivroDiario />} />
                <Route path="/relatorios/ecf" element={<ECF />} />
                <Route path="/relatorios/analise-vendas" element={<AnaliseVendas />} />
                <Route path="/relatorios/analise-compras" element={<AnaliseCompras />} />
                {/* Redirects reports */}
                <Route path="/reports" element={<Navigate to="/relatorios" replace />} />
                <Route path="/reports/drilldown" element={<Navigate to="/relatorios/drilldown" replace />} />
                
                {/* ============ ADMINISTRAÇÃO (PT-BR) ============ */}
                <Route path="/admin" element={<AdminIndex />} />
                <Route path="/admin/maturidade-erp" element={<ModuleMaturityReport />} />
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
                <Route path="/admin/auditoria-compliance" element={<AdminAuditCompliance />} />
                <Route path="/admin/regras-sod" element={<AdminSoDRules />} />
                <Route path="/admin/limites-usuario" element={<AdminUserLimits />} />
                <Route path="/admin/saude-sistema" element={<AdminSystemHealth />} />
                <Route path="/admin/monitor-jobs" element={<AdminJobsMonitor />} />
                <Route path="/admin/performance" element={<PerformanceDashboard />} />
                <Route path="/admin/go-live" element={<AdminGoLive />} />
                <Route path="/admin/navegacao" element={<AdminNavigationSettings />} />
                <Route path="/admin/relatorio-seguranca" element={<AdminSecurityReport />} />
                <Route path="/admin/gestao-usuarios" element={<UserManagement />} />
                {/* Backup & Recovery */}
                <Route path="/admin/backup" element={<BackupIndex />} />
                <Route path="/admin/backup/jobs" element={<BackupJobs />} />
                <Route path="/admin/backup/historico" element={<BackupHistorico />} />
                <Route path="/admin/backup/politica" element={<BackupPolitica />} />
                <Route path="/admin/backup/configuracoes" element={<BackupConfiguracoes />} />
                
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
                
                {/* ============ CRM ============ */}
                <Route path="/crm" element={<CRMIndex />} />
                <Route path="/crm/pipeline" element={<CRMPipeline />} />
                <Route path="/crm/leads" element={<CRMLeads />} />
                <Route path="/crm/vendedores" element={<CRMVendedores />} />
                <Route path="/crm/comissoes" element={<CRMComissoes />} />
                <Route path="/crm/metas" element={<CRMMetas />} />
                <Route path="/crm/meu-painel" element={<SellerCockpit />} />
                <Route path="/crm/proposta/:opportunityId" element={<QuoteBuilder />} />
                
                {/* ============ CONTRATOS / RECORRÊNCIA ============ */}
                <Route path="/contratos/recorrencia" element={<RecorrenciaPage />} />
                
                {/* ============ PROJETOS ============ */}
                <Route path="/projetos" element={<GestaoProjetosPage />} />
                <Route path="/projetos/gestao" element={<GestaoProjetosPage />} />
                
                {/* ============ DEVELOPER PORTAL & MARKETPLACE ============ */}
                <Route path="/developers" element={<DeveloperPortal />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/api/docs" element={<APIDocs />} />
                <Route path="/settings/api-keys" element={<APIKeysPage />} />
                <Route path="/configuracoes/api-keys" element={<APIKeysPage />} />
                
                {/* ============ HCM & DEPARTAMENTO PESSOAL ============ */}
                <Route path="/hcm" element={<HCMIndex />} />
                <Route path="/hcm/colaboradores" element={<HCMColaboradores />} />
                <Route path="/hcm/integracoes-ponto" element={<HCMIntegracoesPonto />} />
                <Route path="/hcm/folha" element={<HCMFolhaInteligente />} />
                <Route path="/hcm/people-analytics" element={<HCMPeopleAnalytics />} />
                <Route path="/hcm/beneficios" element={<HCMBeneficios />} />
                <Route path="/hcm/solicitacoes" element={<HCMSolicitacoes />} />
                <Route path="/hcm/holerites" element={<HCMHolerites />} />
                <Route path="/hcm/banco-horas" element={<HCMBancoHoras />} />
                <Route path="/hcm/portal" element={<HCMPortalColaborador />} />
                <Route path="/hcm/gestor-ponto" element={<HCMGestorPonto />} />

                {/* ============ SUPPLY CHAIN ============ */}
                <Route path="/supplychain" element={<SupplyChainIndex />} />

                {/* ============ NOVOS MÓDULOS PRD ============ */}
                <Route path="/painel" element={<PainelIndividual />} />
                <Route path="/metas/gestao" element={<GestaoMetas />} />
                <Route path="/metas/mapa" element={<MapaEstrategico />} />
                <Route path="/qualidade/falhas" element={<InvestigacaoFalhas />} />
                <Route path="/processos/gestao" element={<GestaoProcessos />} />
                <Route path="/ia/operacional" element={<IAOperacional />} />

                {/* ============ AUTOPILOTO (PT-BR) ============ */}
                <Route path="/autopiloto/caixa-entrada" element={<Inbox />} />
                <Route path="/autopiloto/pendente" element={<PendingCenter />} />
                <Route path="/autopiloto/regras" element={<AutomationRules />} />
                <Route path="/autopiloto/whatsapp" element={<WhatsAppConfig />} />
                <Route path="/autopiloto/decisoes" element={<Decisoes />} />
                
                {/* ============ DOCUMENTAÇÃO ============ */}
                <Route path="/documentacao" element={<Documentacao />} />
                <Route path="/ajuda" element={<Navigate to="/documentacao" replace />} />
                <Route path="/docs" element={<Navigate to="/documentacao" replace />} />
                <Route path="/help" element={<Navigate to="/documentacao" replace />} />
                
                {/* Redirects autopilot antigas */}
                <Route path="/autopilot/inbox" element={<Navigate to="/autopiloto/caixa-entrada" replace />} />
                <Route path="/autopilot/pending" element={<Navigate to="/autopiloto/pendente" replace />} />
                <Route path="/autopilot/rules" element={<Navigate to="/autopiloto/regras" replace />} />
                <Route path="/autopilot/whatsapp" element={<Navigate to="/autopiloto/whatsapp" replace />} />

                <Route path="/emprestimos" element={<EmprestimosIndex />} />
                <Route path="/emprestimos/novo" element={<EmprestimosNovo />} />
                <Route path="/emprestimos/agente" element={<AgentEmprestimos />} />
                <Route path="/emprestimos/:id" element={<EmprestimosCronograma />} />
                <Route path="/ia/agente-caixa" element={<AgenteCaixa />} />
                <Route path="/ia/agente-conciliacao" element={<AgenteConciliacao />} />
                <Route path="/ia/agente-auditor" element={<AgenteAuditor />} />
                <Route path="/ar/emissao-boleto" element={<AREmissaoBoleto />} />
                <Route path="/ar/regua-cobranca" element={<ARReguaCobrancaIA />} />
                <Route path="/ar/agente" element={<ARAgentAR />} />
                <Route path="/ap/lancamento-nf" element={<APLancamentoNF />} />
                <Route path="/ap/aprovacoes" element={<APWorkflowAprovacao />} />
                <Route path="/ap/bordero" element={<APBordero />} />
                <Route path="/ap/agente" element={<APAgentAP />} />
                </Route>{/* fecha Route element={<AppLayout>} */}

                {/* Grupo Econômico — VirtruvIA Blueprint v1.0 */}
                <Route path="/grupo/visao-geral" element={<GroupDashboard />} />
                <Route path="/grupo/empresas" element={<GrupoEmpresas />} />
                <Route path="/grupo/intercompany" element={<GrupoIntercompany />} />
                <Route path="/grupo/balancete" element={<GrupoBalancete />} />
                <Route path="/grupo/demonstrativos" element={<GrupoDemonstrativos />} />
                <Route path="/grupo/cambio" element={<GrupoCambio />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </NavigationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;