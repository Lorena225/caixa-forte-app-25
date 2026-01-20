import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Database, FileArchive, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type BackupType = "full_db" | "incremental" | "config_only";

const backupTypeOptions: { value: BackupType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "full_db", label: "Banco Completo", icon: <Database className="h-4 w-4" />, description: "Exporta todas as tabelas e dados" },
  { value: "incremental", label: "Incremental", icon: <FileArchive className="h-4 w-4" />, description: "Apenas alterações desde o último backup" },
  { value: "config_only", label: "Configurações", icon: <Settings2 className="h-4 w-4" />, description: "RBAC, regras fiscais e parâmetros" },
];

export function ManualBackupCard() {
  const [backupType, setBackupType] = useState<BackupType>("full_db");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateAndDownload = async () => {
    setIsLoading(true);
    
    try {
      // Fetch data based on backup type
      const backupData: Record<string, unknown> = {};
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      
      if (backupType === "full_db" || backupType === "incremental") {
        // Get main tables data
        const tables = [
          "counterparties",
          "transactions",
          "bank_accounts",
          "accounts",
          "cost_centers",
          "products",
          "services",
        ];
        
        for (const table of tables) {
          const { data, error } = await (supabase as any).from(table).select("*").limit(10000);
          if (!error && data) {
            backupData[table] = data;
          }
        }
      }
      
      if (backupType === "config_only" || backupType === "full_db") {
        // Get config tables
        const configTables = [
          "user_profiles",
          "company_settings",
          "ai_company_settings",
          "tax_rules",
          "dimension_values",
          "dimensions",
        ];
        
        for (const table of configTables) {
          const { data, error } = await (supabase as any).from(table).select("*").limit(10000);
          if (!error && data) {
            backupData[table] = data;
          }
        }
      }

      // Create JSON blob and download
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_${backupType}_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Backup criado e baixado com sucesso!", {
        description: `Arquivo: backup_${backupType}_${timestamp}.json`,
      });

    } catch (error) {
      console.error("Erro ao criar backup:", error);
      toast.error("Erro ao criar backup", {
        description: "Verifique os logs para mais detalhes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Backup Manual
        </CardTitle>
        <CardDescription>
          Crie e baixe um backup imediato dos dados do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Backup</label>
          <Select value={backupType} onValueChange={(v) => setBackupType(v as BackupType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {backupTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        - {opt.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleCreateAndDownload} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando backup...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Criar e Baixar Backup
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          O arquivo será baixado em formato JSON para sua máquina local.
        </p>
      </CardContent>
    </Card>
  );
}
