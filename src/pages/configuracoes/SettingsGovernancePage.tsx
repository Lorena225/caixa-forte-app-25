import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Settings,
  Shield,
  Link2,
  Database,
  FileText,
  Palette,
  Users,
  Activity,
  Key,
  Building2,
  Mail,
  Landmark,
} from "lucide-react";

// Tab Components
import { GeneralSettingsTab } from "@/components/settings/GeneralSettingsTab";
import { SecuritySettingsTab } from "@/components/settings/SecuritySettingsTab";
import { IntegrationsSettingsTab } from "@/components/settings/IntegrationsSettingsTab";
import { GlobalParametersTab } from "@/components/settings/GlobalParametersTab";
import { FiscalSettingsTab } from "@/components/settings/FiscalSettingsTab";
import { BrandingSettingsTab } from "@/components/settings/BrandingSettingsTab";
import { AuditLogsTab } from "@/components/settings/AuditLogsTab";

const SETTINGS_TABS = [
  {
    id: "general",
    label: "Geral",
    icon: Building2,
    description: "Dados da empresa e configurações básicas",
  },
  {
    id: "security",
    label: "Segurança",
    icon: Shield,
    description: "Usuários, permissões e controle de acesso",
  },
  {
    id: "integrations",
    label: "Integrações",
    icon: Link2,
    description: "APIs, webhooks e conexões externas",
  },
  {
    id: "parameters",
    label: "Parâmetros Globais",
    icon: Database,
    description: "Plano de Contas, Centros de Custo, Bancos",
  },
  {
    id: "fiscal",
    label: "Fiscal",
    icon: FileText,
    description: "Certificado digital, regime tributário",
  },
  {
    id: "branding",
    label: "Personalização",
    icon: Palette,
    description: "Logo, cores, SMTP personalizado",
  },
  {
    id: "audit",
    label: "Auditoria",
    icon: Activity,
    description: "Logs de alterações e rastreabilidade",
  },
];

export default function SettingsGovernancePage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Configurações & Governança
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie parâmetros globais, segurança, integrações e compliance do sistema
          </p>
        </div>

        <div className="flex gap-6">
          {/* Vertical Tabs Navigation */}
          <div className="w-64 shrink-0">
            <nav className="space-y-1 sticky top-6">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                      "hover:bg-muted/50",
                      isActive && "bg-primary/10 border-l-4 border-primary"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "font-medium text-sm",
                          isActive ? "text-primary" : "text-foreground"
                        )}
                      >
                        {tab.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {tab.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="pr-4">
                {activeTab === "general" && <GeneralSettingsTab />}
                {activeTab === "security" && <SecuritySettingsTab />}
                {activeTab === "integrations" && <IntegrationsSettingsTab />}
                {activeTab === "parameters" && <GlobalParametersTab />}
                {activeTab === "fiscal" && <FiscalSettingsTab />}
                {activeTab === "branding" && <BrandingSettingsTab />}
                {activeTab === "audit" && <AuditLogsTab />}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
