import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PlanoContas from "./pages/cadastros/PlanoContas";
import CentrosCusto from "./pages/cadastros/CentrosCusto";
import ClientesFornecedores from "./pages/cadastros/ClientesFornecedores";
import Carteiras from "./pages/cadastros/Carteiras";
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
import ImportExportIndex from "./pages/importar-exportar/Index";
import ImportWizard from "./pages/importar-exportar/ImportWizard";
import ImportHistory from "./pages/importar-exportar/ImportHistory";
import ExportData from "./pages/importar-exportar/ExportData";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="/integracoes" element={<IntegracoesIndex />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
