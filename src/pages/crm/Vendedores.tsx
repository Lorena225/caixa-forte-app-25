import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, User, Mail, Phone, Percent, Target, Edit } from "lucide-react";
import { useSellers, useSalesGoals, type Seller } from "@/hooks/useCRM";
import { format } from "date-fns";

export default function Vendedores() {
  const { data: sellers = [], createSeller, updateSeller } = useSellers();
  const { data: goals = [] } = useSalesGoals({ year: new Date().getFullYear() });
  const [isOpen, setIsOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    base_commission_percent: "",
    goal_monthly: "",
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", cpf: "", base_commission_percent: "", goal_monthly: "" });
    setEditingSeller(null);
  };

  const openNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name,
      email: seller.email || "",
      phone: seller.phone || "",
      cpf: seller.cpf || "",
      base_commission_percent: seller.base_commission_percent?.toString() || "",
      goal_monthly: seller.goal_monthly?.toString() || "",
    });
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;
    
    const data = {
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      cpf: formData.cpf || undefined,
      base_commission_percent: parseFloat(formData.base_commission_percent) || 0,
      goal_monthly: parseFloat(formData.goal_monthly) || 0,
    };

    if (editingSeller) {
      updateSeller.mutate({ id: editingSeller.id, ...data });
    } else {
      createSeller.mutate(data);
    }
    
    setIsOpen(false);
    resetForm();
  };

  const getSellerGoal = (sellerId: string) => {
    const currentMonth = new Date().getMonth() + 1;
    return goals.find(g => g.seller_id === sellerId && g.period_month === currentMonth);
  };

  const activeSellers = sellers.filter(s => s.is_active);
  const inactiveSellers = sellers.filter(s => !s.is_active);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Vendedores" description="Equipe comercial e comissões">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Vendedor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSeller ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nome *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>CPF</Label>
                  <Input 
                    value={formData.cpf} 
                    onChange={e => setFormData({...formData, cpf: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Comissão Base (%)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.base_commission_percent} 
                      onChange={e => setFormData({...formData, base_commission_percent: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Meta Mensal (R$)</Label>
                    <Input 
                      type="number"
                      value={formData.goal_monthly} 
                      onChange={e => setFormData({...formData, goal_monthly: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={!formData.name}>
                  {editingSeller ? "Salvar Alterações" : "Criar Vendedor"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" /> Total de Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSellers.length}</div>
              <p className="text-xs text-muted-foreground">ativos na equipe</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" /> Comissão Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeSellers.length > 0 
                  ? (activeSellers.reduce((sum, s) => sum + (s.base_commission_percent || 0), 0) / activeSellers.length).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">base da equipe</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" /> Meta Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeSellers.reduce((sum, s) => sum + (s.goal_monthly || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">mensal da equipe</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Meta Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum vendedor cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sellers.map(seller => {
                    const goal = getSellerGoal(seller.id);
                    return (
                      <TableRow key={seller.id}>
                        <TableCell className="font-mono text-sm">{seller.code}</TableCell>
                        <TableCell>
                          <div className="font-medium">{seller.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {seller.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {seller.email}
                              </div>
                            )}
                            {seller.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {seller.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{seller.base_commission_percent || 0}%</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            {(seller.goal_monthly || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                          {goal && (
                            <div className="text-xs text-muted-foreground">
                              {goal.achievement_percent.toFixed(0)}% atingido
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={seller.is_active ? "default" : "secondary"}>
                            {seller.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(seller)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
