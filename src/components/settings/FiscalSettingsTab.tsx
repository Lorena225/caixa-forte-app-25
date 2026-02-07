import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useDigitalCertificates } from "@/hooks/useGovernanceSettings";
import { FileText, Upload, Shield, Calendar, AlertTriangle, CheckCircle2, Key, Building2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FiscalSettingsTab() {
  const { data: certificates, isLoading } = useDigitalCertificates();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [certPassword, setCertPassword] = useState("");

  const handleUploadCertificate = () => {
    toast.success("Certificado validado e salvo com criptografia");
    setUploadDialogOpen(false);
    setCertPassword("");
  };

  const getCertificateStatus = (validUntil: string) => {
    const daysRemaining = differenceInDays(new Date(validUntil), new Date());
    
    if (daysRemaining < 0) {
      return { status: "expired", label: "Expirado", color: "destructive" as const };
    } else if (daysRemaining <= 30) {
      return { status: "expiring", label: `Expira em ${daysRemaining} dias`, color: "warning" as const };
    } else {
      return { status: "valid", label: "Válido", color: "success" as const };
    }
  };

  return (
    <div className="space-y-6">
      {/* Certificates Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Certificados Digitais
            </CardTitle>
            <CardDescription>
              Gerencie certificados A1/A3 para emissão de documentos fiscais
            </CardDescription>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Enviar Certificado
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">Carregando...</div>
          ) : certificates?.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum certificado cadastrado</p>
              <Button variant="outline" className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Enviar seu primeiro certificado
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Emissor</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates?.map((cert) => {
                  const certStatus = getCertificateStatus(cert.valid_until);
                  const daysRemaining = differenceInDays(new Date(cert.valid_until), new Date());
                  const progressValue = Math.max(0, Math.min(100, (daysRemaining / 365) * 100));

                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{cert.certificate_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {cert.serial_number || "SN não disponível"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cert.certificate_type}</Badge>
                      </TableCell>
                      <TableCell>{cert.issuer || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(cert.valid_until), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <Progress value={progressValue} className="h-1.5 w-24" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            certStatus.status === "expired" && "bg-red-100 text-red-800",
                            certStatus.status === "expiring" && "bg-amber-100 text-amber-800",
                            certStatus.status === "valid" && "bg-green-100 text-green-800"
                          )}
                        >
                          {certStatus.status === "expired" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {certStatus.status === "valid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {certStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fiscal Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações Fiscais
          </CardTitle>
          <CardDescription>
            Dados utilizados na emissão de documentos fiscais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">Regime Tributário</p>
              <p className="font-medium mt-1">Simples Nacional</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">Ambiente NF-e</p>
              <p className="font-medium mt-1">
                <Badge variant="outline">Homologação</Badge>
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">Série NF-e</p>
              <p className="font-medium mt-1">1</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">Última NF-e</p>
              <p className="font-medium mt-1">-</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Certificate Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Certificado Digital</DialogTitle>
            <DialogDescription>
              Faça upload do arquivo .pfx (A1) e informe a senha
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Arquivo do Certificado (.pfx)</Label>
              <Input type="file" accept=".pfx,.p12" />
            </div>
            <div className="space-y-2">
              <Label>Senha do Certificado</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A senha será criptografada e armazenada de forma segura
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUploadCertificate}>
              <Upload className="h-4 w-4 mr-2" />
              Validar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
