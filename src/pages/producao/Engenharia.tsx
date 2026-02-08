import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Layers, Route, Edit, Trash2, Copy, ChevronRight } from "lucide-react";
import { useBOMs, useWorkCenters, useProducts } from "@/hooks/usePCP";
import { toast } from "sonner";

export default function Engenharia() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBOM, setSelectedBOM] = useState<string | null>(null);
  const [isNewBOMOpen, setIsNewBOMOpen] = useState(false);
  
  const { data: boms = [], isLoading: bomsLoading } = useBOMs();
  const { data: workCenters = [], isLoading: centersLoading } = useWorkCenters();
  const { data: products = [] } = useProducts();

  const filteredBOMs = boms.filter(bom => 
    bom.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.products?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Engenharia de Produto"
          description="Gerencie BOMs (Estrutura de Produto) e Roteiros de Fabricação"
        />

        <Tabs defaultValue="bom" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bom" className="gap-2">
              <Layers className="h-4 w-4" />
              BOMs
            </TabsTrigger>
            <TabsTrigger value="roteiros" className="gap-2">
              <Route className="h-4 w-4" />
              Roteiros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bom" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar BOM por produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={isNewBOMOpen} onOpenChange={setIsNewBOMOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova BOM
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nova Estrutura de Produto (BOM)</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Produto Acabado</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.code} - {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Versão</Label>
                        <Input placeholder="1.0" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome da Estrutura</Label>
                      <Input placeholder="Nome descritivo da BOM" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsNewBOMOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => {
                        toast.success("BOM criada com sucesso!");
                        setIsNewBOMOpen(false);
                      }}>
                        Criar BOM
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Componentes</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredBOMs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma BOM encontrada. Crie a primeira estrutura de produto.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBOMs.map(bom => (
                      <TableRow 
                        key={bom.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedBOM(bom.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            {bom.products?.name || 'Sem produto'}
                          </div>
                        </TableCell>
                        <TableCell>v{bom.version}</TableCell>
                        <TableCell>
                          <Badge variant={bom.is_active ? "default" : "secondary"}>
                            {bom.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>{bom.bom_components?.length || 0} itens</TableCell>
                        <TableCell>
                          {bom.created_at ? new Date(bom.created_at).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="roteiros" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Roteiros de Fabricação</CardTitle>
                <CardDescription>
                  Defina a sequência de operações e tempos de produção
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma BOM para gerenciar seu roteiro</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
