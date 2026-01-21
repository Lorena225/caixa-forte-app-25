import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoles } from '@/hooks/useRoles';
import { usePermissions, useRolePermissions } from '@/hooks/usePermissions';
import { useUserCustomPermissions } from '@/hooks/useUsers';
import { PermissionBadge } from './PermissionBadge';
import type { UserProfile, Permission } from '@/types/permissions';

const userSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  role_id: z.string().min(1, 'Selecione um papel'),
  is_active: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserDialogProps {
  open: boolean;
  user: UserProfile | null;
  onSave: (data: UserFormData & { addPermissions: string[]; removePermissions: string[] }) => Promise<void>;
  onCancel: () => void;
}

export function UserDialog({ open, user, onSave, onCancel }: UserDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [customPermsOpen, setCustomPermsOpen] = useState(false);
  const [addingPermission, setAddingPermission] = useState(false);
  const [customAdditions, setCustomAdditions] = useState<string[]>([]);
  const [customRemovals, setCustomRemovals] = useState<string[]>([]);

  const { data: roles = [], isLoading: loadingRoles } = useRoles();
  const { data: allPermissions = [], isLoading: loadingPermissions } = usePermissions();
  const { data: rolePermissions = [] } = useRolePermissions(user?.role_id || null);
  const { data: existingCustomPerms = [], isLoading: loadingCustom } = useUserCustomPermissions(user?.id || null);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      role_id: '',
      is_active: true,
    },
  });

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || '',
        role_id: user.role_id || '',
        is_active: user.is_active,
      });
      // Initialize custom permissions from existing
      const adds = existingCustomPerms.filter((c) => c.granted).map((c) => c.permission_id);
      const removes = existingCustomPerms.filter((c) => !c.granted).map((c) => c.permission_id);
      setCustomAdditions(adds);
      setCustomRemovals(removes);
    }
  }, [user, form, existingCustomPerms]);

  const selectedRoleId = form.watch('role_id');

  // Get permissions for selected role
  const { data: selectedRolePerms = [] } = useRolePermissions(selectedRoleId);

  // Available permissions for custom addition
  const availableForAddition = allPermissions.filter(
    (p) =>
      !selectedRolePerms.some((rp) => rp.id === p.id) &&
      !customAdditions.includes(p.id)
  );

  const handleAddCustomPermission = (permissionId: string) => {
    setCustomAdditions((prev) => [...prev, permissionId]);
    setAddingPermission(false);
  };

  const handleRemoveCustomAddition = (permissionId: string) => {
    setCustomAdditions((prev) => prev.filter((id) => id !== permissionId));
  };

  const handleToggleRolePermissionRemoval = (permissionId: string) => {
    setCustomRemovals((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = async (data: UserFormData) => {
    setIsSaving(true);
    try {
      await onSave({
        ...data,
        addPermissions: customAdditions,
        removePermissions: customRemovals,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingRoles || loadingPermissions || loadingCustom;

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>Altere as informações e permissões do usuário</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {/* Email (read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={user.email || 'Não informado'} disabled className="bg-muted" />
                </div>

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do usuário" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Papel *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um papel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Status Ativo</FormLabel>
                        <FormDescription className="text-xs">
                          Usuários inativos não podem acessar o sistema
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Custom Permissions */}
                <Collapsible open={customPermsOpen} onOpenChange={setCustomPermsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span>Permissões Customizadas</span>
                      <div className="flex items-center gap-2">
                        {(customAdditions.length > 0 || customRemovals.length > 0) && (
                          <Badge variant="secondary" className="text-xs">
                            +{customAdditions.length} / -{customRemovals.length}
                          </Badge>
                        )}
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            customPermsOpen && 'rotate-180'
                          )}
                        />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-3">
                    {/* Role base permissions */}
                    {selectedRolePerms.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Permissões do papel (clique para remover):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRolePerms.map((perm) => (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => handleToggleRolePermissionRemoval(perm.id)}
                              className={cn(
                                'transition-opacity',
                                customRemovals.includes(perm.id) && 'opacity-40 line-through'
                              )}
                            >
                              <PermissionBadge permission={perm} size="sm" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom additions */}
                    {customAdditions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Permissões extras:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {customAdditions.map((id) => {
                            const perm = allPermissions.find((p) => p.id === id);
                            if (!perm) return null;
                            return (
                              <PermissionBadge
                                key={id}
                                permission={perm}
                                size="sm"
                                onRemove={() => handleRemoveCustomAddition(id)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add permission */}
                    {addingPermission ? (
                      <Select onValueChange={handleAddCustomPermission}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecione uma permissão..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableForAddition.map((perm) => (
                            <SelectItem key={perm.id} value={perm.id}>
                              {perm.module} · {perm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setAddingPermission(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar Permissão
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving || isLoading}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
