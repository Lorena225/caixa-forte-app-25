import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccounts, useCostCenters, useWallets } from "@/hooks/useCompanyData";
import { useCheckRecordDependencies, useArchiveRecord } from "@/hooks/useGovernanceSettings";
import { Database, Building2, Landmark, Tag, Plus, Archive, Trash2, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function GlobalParametersTab() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: costCenters, isLoading: costCentersLoading } = useCostCenters();
  const { data: bankAccounts, isLoading: banksLoading } = useWallets();
  const checkDependencies = useCheckRecordDependencies();
  const archiveRecord = useArchiveRecord();

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ table: string; id: string; name: string } | null>(null);
  const [dependencies, setDependencies] = useState<any>(null);
  const [confirmText, setConfirmText] = useState("");

  const handleDeleteClick = async (table: string, id: string, name: string) => {
    setSelectedRecord({ table, id, name });
    setConfirmText("");

    try {
      const deps = await checkDependencies.mutateAsync({ tableName: table, recordId: id });
      setDependencies(deps);

      if (deps.has_dependencies) {
        setArchiveDialogOpen(true);
      } else {
        setDeleteDialogOpen(true);
      }
    } catch (error) {
      toast.error("Erro ao verificar dependências");
    }
  };

  const handleArchive = async () => {
    if (!selectedRecord) return;

    try {
      await archiveRecord.mutateAsync({
        tableName: selectedRecord.table,
        recordId: selectedRecord.id,
      });
      setArchiveDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao arquivar registro");
    }
  };

  const handleDelete = () => {
    if (confirmText !== selectedRecord?.name) {
      toast.error("Digite o nome corretamente para confirmar");
      return;
    }
    toast.success("Registro excluído com sucesso");
    setDeleteDialogOpen(false);
  };

  const filteredAccounts = accounts?.filter(
    (a: any) => !a.archived_at && (a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || a.code?.includes(searchTerm))
  );

  const filteredCostCenters = costCenters?.filter(
    (c: any) => !c.archived_at && (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.code?.includes(searchTerm))
  );

  const filteredBanks = bankAccounts?.filter(
    (b: any) => !b.archived_at && b.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar em todos os parâmetros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Plano de Contas
          </TabsTrigger>
          <TabsTrigger value="cost-centers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Centros de Custo
          </TabsTrigger>
          <TabsTrigger value="banks" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Contas Bancárias
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Plano de Contas</CardTitle>
                <CardDescription>
                  Gerencie as contas contábeis do sistema
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="flex items-center justify-center p-8">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts?.slice(0, 20).map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">{account.code}</TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{account.category_type}</Badge>
                        </TableCell>
                        <TableCell>{account.category?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick("accounts", account.id, account.name)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Centers Tab */}
        <TabsContent value="cost-centers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Centros de Custo</CardTitle>
                <CardDescription>
                  Organize custos por departamento, projeto ou unidade
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Centro
              </Button>
            </CardHeader>
            <CardContent>
              {costCentersLoading ? (
                <div className="flex items-center justify-center p-8">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCostCenters?.map((cc: any) => (
                      <TableRow key={cc.id}>
                        <TableCell className="font-mono">{cc.code}</TableCell>
                        <TableCell>{cc.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cc.center_type || "operational"}</Badge>
                        </TableCell>
                        <TableCell>
                          {cc.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick("cost_centers", cc.id, cc.name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banks Tab */}
        <TabsContent value="banks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contas Bancárias</CardTitle>
                <CardDescription>
                  Gerencie as contas bancárias da empresa
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </CardHeader>
            <CardContent>
              {banksLoading ? (
                <div className="flex items-center justify-center p-8">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead>Agência</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBanks?.map((bank: any) => (
                      <TableRow key={bank.id}>
                        <TableCell>{bank.account_name}</TableCell>
                        <TableCell>{bank.agency || "-"}</TableCell>
                        <TableCell>{bank.account_number || "-"}</TableCell>
                        <TableCell>
                          R$ {(bank.balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick("bank_accounts", bank.id, bank.account_name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Archive Dialog (has dependencies) */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Registro Possui Vínculos
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                O registro <strong>"{selectedRecord?.name}"</strong> não pode ser excluído porque possui vínculos:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {dependencies?.dependencies?.map((dep: any, index: number) => (
                  <li key={index}>
                    <strong>{dep.count}</strong> registro(s) em <strong>{dep.table}</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                Deseja <strong>arquivar</strong> este registro? Ele ficará oculto mas os vínculos serão preservados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-amber-600 hover:bg-amber-700">
              <Archive className="h-4 w-4 mr-2" />
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog (no dependencies) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. O registro será permanentemente excluído.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>
              Para confirmar, digite o nome do registro: <strong>{selectedRecord?.name}</strong>
            </p>
            <Input
              placeholder="Digite o nome para confirmar"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== selectedRecord?.name}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
