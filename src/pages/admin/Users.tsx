import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCompanyUsers, useUpdateUserRole, useRemoveCompanyUser } from "@/hooks/useAdminSettings";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Users, Trash2, Shield, UserPlus } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showDevelopmentToast } from "@/utils/devFeedback";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  visualizador: "Visualizador",
};

const roleBadgeVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "default",
  gestor: "secondary",
  visualizador: "outline",
};

export default function AdminUsers() {
  const { data: users, isLoading } = useCompanyUsers();
  const updateRole = useUpdateUserRole();
  const removeUser = useRemoveCompanyUser();
  const { user: currentUser, currentCompany } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "gestor" | "visualizador">("gestor");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail || !currentCompany?.id) return;
    
    setInviting(true);
    try {
      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', inviteEmail)
        .maybeSingle();

      if (existingProfile) {
        // User exists, add to company
        const { error } = await supabase.from('company_users').insert([{
          company_id: currentCompany.id,
          user_id: existingProfile.id,
          role: inviteRole,
        }]);
        if (error) throw error;
        toast.success("Usuário adicionado à empresa");
      } else {
        // For now, just show a message - in production, send invite email
        showDevelopmentToast('Convite por email');
      }
      
      setInviteOpen(false);
      setInviteEmail("");
    } catch (error: any) {
      toast.error("Erro ao convidar usuário: " + error.message);
    } finally {
      setInviting(false);
    }
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
          title="Usuários"
          description="Gerenciar usuários e suas permissões na empresa"
        >
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Convidar Usuário
              </Button>
            </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Usuário</DialogTitle>
                  <DialogDescription>
                    Envie um convite para um novo usuário participar da empresa
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Papel</Label>
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                    {inviting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Enviar Convite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários da Empresa
            </CardTitle>
            <CardDescription>
              {users?.length || 0} usuário(s) com acesso à empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((companyUser: any) => (
                  <TableRow key={companyUser.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {companyUser.profiles?.full_name || "Sem nome"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {companyUser.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={companyUser.role}
                        onValueChange={(value: any) => 
                          updateRole.mutate({ id: companyUser.id, role: value })
                        }
                        disabled={companyUser.user_id === currentUser?.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue>
                            <Badge variant={roleBadgeVariants[companyUser.role] || "outline"}>
                              <Shield className="h-3 w-3 mr-1" />
                              {roleLabels[companyUser.role] || companyUser.role}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="visualizador">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {companyUser.is_default && (
                        <Badge variant="outline">Padrão</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={companyUser.user_id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário perderá acesso à empresa. Esta ação pode ser desfeita adicionando-o novamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeUser.mutate(companyUser.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
