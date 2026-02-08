import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Settings, 
  Edit, 
  Trash2, 
  Factory,
  Clock,
  DollarSign,
  Users
} from "lucide-react";
import { useWorkCenters } from "@/hooks/usePCP";
import { toast } from "sonner";

export default function CentrosTrabalho() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  
  const { data: workCenters = [], isLoading } = useWorkCenters();

  const filteredCenters = workCenters.filter(wc => 
    wc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wc.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    {
      title: "Total de Centros",
      value: workCenters.length,
      icon: Factory,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Ativos",
      value: workCenters.filter(wc => wc.is_active).length,
      icon: Settings,
      color: "text-green-600",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Capacidade Total (h/dia)",
      value: workCenters.reduce((acc, wc) => acc + (wc.capacity_hours_day || 0), 0).toFixed(0),
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10"
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Centros de Trabalho"
          description="Configure máquinas, recursos e custos hora de produção"
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar centro de trabalho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Centro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Centro de Trabalho</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input placeholder="CT-001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="machine">Máquina</SelectItem>
                        <SelectItem value="labor">Mão de Obra</SelectItem>
                        <SelectItem value="workstation">Estação de Trabalho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Nome do centro de trabalho" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Custo Hora (R$)</Label>
                    <Input type="number" placeholder="0.00" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidade (h/dia)</Label>
                    <Input type="number" placeholder="8" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => {
                    toast.success("Centro de trabalho criado!");
                    setIsNewDialogOpen(false);
                  }}>
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Custo/Hora</TableHead>
                <TableHead className="text-right">Capacidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredCenters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum centro de trabalho cadastrado.</p>
                    <p className="text-sm">Crie o primeiro para começar.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCenters.map(wc => (
                  <TableRow key={wc.id}>
                    <TableCell className="font-mono">{wc.code}</TableCell>
                    <TableCell className="font-medium">{wc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {wc.work_center_type === 'machine' ? 'Máquina' :
                         wc.work_center_type === 'labor' ? 'Mão de Obra' : 'Estação'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      R$ {wc.hourly_cost?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell className="text-right">
                      {wc.capacity_hours_day || 8}h/dia
                    </TableCell>
                    <TableCell>
                      <Badge variant={wc.is_active ? "default" : "secondary"}>
                        {wc.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
