import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Play,
  Trash2,
  Clock,
  Database,
  FileText,
  HardDrive,
  Settings,
  Upload,
} from "lucide-react";
import {
  useBackupJobs,
  useCreateBackupJob,
  useUpdateBackupJob,
  useDeleteBackupJob,
  useTriggerBackup,
} from "@/hooks/useBackupManagement";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoLabels: Record<string, { label: string; icon: typeof Database }> = {
  full_db: { label: "Banco Completo", icon: Database },
  incremental_db: { label: "Incremental", icon: Database },
  config_only: { label: "Configurações", icon: Settings },
  arquivos: { label: "Arquivos", icon: HardDrive },
  tenant_export: { label: "Exportação Tenant", icon: Upload },
  outro: { label: "Outro", icon: FileText },
};

const frequenciaLabels: Record<string, string> = {
  horario: "A cada hora",
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
  manual: "Manual",
};

const alvoLabels: Record<string, string> = {
  principal: "Principal",
  homologacao: "Homologação",
  offsite: "Offsite",
  local: "Local",
};

export default function BackupJobs() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome_job: "",
    tipo: "full_db",
    frequencia: "diario",
    alvo: "principal",
    descricao: "",
  });

  const { data: jobs, isLoading } = useBackupJobs();
  const createJob = useCreateBackupJob();
  const updateJob = useUpdateBackupJob();
  const deleteJob = useDeleteBackupJob();
  const triggerBackup = useTriggerBackup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createJob.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({
      nome_job: "",
      tipo: "full_db",
      frequencia: "diario",
      alvo: "principal",
      descricao: "",
    });
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    await updateJob.mutateAsync({ id, ativo: !currentValue });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Jobs de Backup"
          description="Gerencie os jobs de backup automáticos e manuais"
        />

        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Novo Job de Backup</DialogTitle>
                  <DialogDescription>
                    Configure um novo job de backup para execução automática ou manual.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome_job">Nome do Job</Label>
                    <Input
                      id="nome_job"
                      value={formData.nome_job}
                      onChange={(e) => setFormData({ ...formData, nome_job: e.target.value })}
                      placeholder="backup_full_diario"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Tipo</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(tipoLabels).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Frequência</Label>
                      <Select
                        value={formData.frequencia}
                        onValueChange={(v) => setFormData({ ...formData, frequencia: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(frequenciaLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Alvo</Label>
                    <Select
                      value={formData.alvo}
                      onValueChange={(v) => setFormData({ ...formData, alvo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(alvoLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descrição opcional do job..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createJob.isPending}>
                    {createJob.isPending ? "Criando..." : "Criar Job"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Jobs Configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !jobs?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum job de backup configurado. Crie um novo job para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Alvo</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const TipoIcon = tipoLabels[job.tipo || "outro"]?.icon || FileText;
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.nome_job || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TipoIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{tipoLabels[job.tipo || "outro"]?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {frequenciaLabels[job.frequencia || "manual"]}
                          </Badge>
                        </TableCell>
                        <TableCell>{alvoLabels[job.alvo || "principal"]}</TableCell>
                        <TableCell>
                          <Switch
                            checked={job.ativo ?? false}
                            onCheckedChange={() => handleToggleActive(job.id, job.ativo ?? false)}
                          />
                        </TableCell>
                        <TableCell>
                          {job.created_at
                            ? format(new Date(job.created_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => triggerBackup.mutate(job.id)}
                              disabled={triggerBackup.isPending}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteJob.mutate(job.id)}
                              disabled={deleteJob.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
