import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from "@/hooks/useAdminSettings";
import { Loader2, Building2, Plus, Trash2, Edit, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BranchFormData {
  code: string;
  name: string;
  cnpj: string;
  ie: string;
  im: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  is_headquarters: boolean;
}

const emptyBranch: BranchFormData = {
  code: "",
  name: "",
  cnpj: "",
  ie: "",
  im: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  is_headquarters: false,
};

export default function Branches() {
  const { data: branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [formData, setFormData] = useState<BranchFormData>(emptyBranch);

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setFormData(emptyBranch);
    setDialogOpen(true);
  };

  const handleOpenEdit = (branch: any) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code || "",
      name: branch.name || "",
      cnpj: branch.cnpj || "",
      ie: branch.ie || "",
      im: branch.im || "",
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      zip_code: branch.zip_code || "",
      is_headquarters: branch.is_headquarters || false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingBranch) {
      await updateBranch.mutateAsync({ id: editingBranch.id, ...formData });
    } else {
      await createBranch.mutateAsync(formData);
    }
    setDialogOpen(false);
    setFormData(emptyBranch);
    setEditingBranch(null);
  };

  const handleInputChange = (field: keyof BranchFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Filiais"
          description="Gerenciar filiais e estabelecimentos da empresa"
          action={{
            label: "Nova Filial",
            onClick: handleOpenCreate,
            icon: <Plus className="mr-2 h-4 w-4" />,
          }}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? "Editar Filial" : "Nova Filial"}
              </DialogTitle>
              <DialogDescription>
                {editingBranch 
                  ? "Atualize os dados da filial" 
                  : "Preencha os dados para criar uma nova filial"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    placeholder="001"
                    value={formData.code}
                    onChange={(e) => handleInputChange("code", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Matriz São Paulo"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0001-00"
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange("cnpj", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ie">Inscrição Estadual</Label>
                  <Input
                    id="ie"
                    placeholder="000.000.000.000"
                    value={formData.ie}
                    onChange={(e) => handleInputChange("ie", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="im">Inscrição Municipal</Label>
                  <Input
                    id="im"
                    placeholder="00000000"
                    value={formData.im}
                    onChange={(e) => handleInputChange("im", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Av. Paulista, 1000 - Sala 100"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    placeholder="SP"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    placeholder="00000-000"
                    value={formData.zip_code}
                    onChange={(e) => handleInputChange("zip_code", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="is_headquarters"
                  checked={formData.is_headquarters}
                  onCheckedChange={(checked) => handleInputChange("is_headquarters", checked)}
                />
                <Label htmlFor="is_headquarters">Esta é a matriz/sede</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!formData.code || !formData.name || createBranch.isPending || updateBranch.isPending}
              >
                {(createBranch.isPending || updateBranch.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingBranch ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Filiais Cadastradas
            </CardTitle>
            <CardDescription>
              {branches?.length || 0} filial(is) cadastrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {branches && branches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch: any) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-mono">{branch.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{branch.name}</span>
                          {branch.is_headquarters && (
                            <Badge variant="default" className="text-xs">Matriz</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {branch.cnpj || "-"}
                      </TableCell>
                      <TableCell>
                        {branch.city && branch.state ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {branch.city}/{branch.state}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={branch.is_active ? "default" : "secondary"}>
                          {branch.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleOpenEdit(branch)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir filial?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Documentos vinculados a esta filial serão desassociados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteBranch.mutate(branch.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma filial cadastrada</p>
                <p className="text-sm">Clique em "Nova Filial" para começar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
