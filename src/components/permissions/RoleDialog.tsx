import { useState, useMemo, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Eye, Plus, Pencil, Trash2, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions, useRolePermissions } from '@/hooks/usePermissions';
import type { Role, Permission, PermissionAction } from '@/types/permissions';

const roleSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome muito longo'),
  description: z.string().max(200, 'Descrição muito longa').optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleDialogProps {
  open: boolean;
  role?: Role | null;
  onSave: (data: RoleFormData & { permissionIds: string[] }) => Promise<void>;
  onCancel: () => void;
}

const actionIcons: Record<string, typeof Eye> = {
  ver: Eye,
  criar: Plus,
  editar: Pencil,
  deletar: Trash2,
  aprovar: CheckCircle,
  configurar: Settings,
};

const actionColors: Record<string, string> = {
  ver: 'text-success',
  criar: 'text-primary',
  editar: 'text-warning',
  deletar: 'text-destructive',
  aprovar: 'text-info',
  configurar: 'text-muted-foreground',
};

export function RoleDialog({ open, role, onSave, onCancel }: RoleDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const { data: allPermissions = [], isLoading: loadingPermissions } = usePermissions();
  const { data: rolePermissions = [], isLoading: loadingRolePerms } = useRolePermissions(role?.id || null);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Initialize form and permissions when role changes
  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [role, form]);

  useEffect(() => {
    if (rolePermissions.length > 0) {
      setSelectedPermissions(new Set(rolePermissions.map((p) => p.id)));
    } else {
      setSelectedPermissions(new Set());
    }
  }, [rolePermissions]);

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    return allPermissions.reduce((acc, perm) => {
      const module = perm.module || 'Outros';
      if (!acc[module]) acc[module] = [];
      acc[module].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [allPermissions]);

  // Calculate summary
  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedPermissions.forEach((id) => {
      const perm = allPermissions.find((p) => p.id === id);
      if (perm?.action) {
        counts[perm.action] = (counts[perm.action] || 0) + 1;
      }
    });
    return counts;
  }, [selectedPermissions, allPermissions]);

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const toggleModuleAll = (module: string, checked: boolean) => {
    const modulePerms = permissionsByModule[module] || [];
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => {
        if (checked) {
          next.add(p.id);
        } else {
          next.delete(p.id);
        }
      });
      return next;
    });
  };

  const isModuleAllSelected = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    return modulePerms.every((p) => selectedPermissions.has(p.id));
  };

  const isModulePartialSelected = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const selected = modulePerms.filter((p) => selectedPermissions.has(p.id)).length;
    return selected > 0 && selected < modulePerms.length;
  };

  const handleSubmit = async (data: RoleFormData) => {
    setIsSaving(true);
    try {
      await onSave({
        ...data,
        permissionIds: Array.from(selectedPermissions),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingPermissions || loadingRolePerms;
  const isEditing = !!role;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Papel' : 'Novo Papel'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere as informações e permissões do papel'
              : 'Defina um nome e selecione as permissões para o novo papel'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <div className="space-y-4 mb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Gerente Financeiro"
                        {...field}
                        disabled={role?.is_system}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva as responsabilidades deste papel..."
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Permissions Section */}
            <div className="flex-1 overflow-hidden border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Permissões</h4>
                  <div className="flex items-center gap-2">
                    {Object.entries(summary).map(([action, count]) => {
                      const Icon = actionIcons[action] || Eye;
                      return (
                        <Badge key={action} variant="outline" className="text-xs gap-1">
                          <Icon className={cn('h-3 w-3', actionColors[action])} />
                          {count}
                        </Badge>
                      );
                    })}
                    <Badge variant="secondary" className="text-xs">
                      {selectedPermissions.size} / {allPermissions.length}
                    </Badge>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Accordion type="multiple" className="px-2">
                    {Object.entries(permissionsByModule).map(([module, perms]) => (
                      <AccordionItem key={module} value={module}>
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isModuleAllSelected(module)}
                              ref={(el) => {
                                if (el) {
                                  (el as HTMLButtonElement).dataset.state = isModulePartialSelected(module)
                                    ? 'indeterminate'
                                    : isModuleAllSelected(module)
                                    ? 'checked'
                                    : 'unchecked';
                                }
                              }}
                              onCheckedChange={(checked) => {
                                toggleModuleAll(module, !!checked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Selecionar todas permissões de ${module}`}
                            />
                            <span className="font-medium">{module}</span>
                            <Badge variant="outline" className="text-xs">
                              {perms.filter((p) => selectedPermissions.has(p.id)).length} / {perms.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-8 pb-2">
                            {perms.map((perm) => {
                              const Icon = actionIcons[perm.action || 'ver'] || Eye;
                              return (
                                <div
                                  key={perm.id}
                                  className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                                >
                                  <Checkbox
                                    id={perm.id}
                                    checked={selectedPermissions.has(perm.id)}
                                    onCheckedChange={() => togglePermission(perm.id)}
                                    aria-label={perm.name}
                                  />
                                  <Icon
                                    className={cn('h-4 w-4 shrink-0', actionColors[perm.action || 'ver'])}
                                  />
                                  <Label
                                    htmlFor={perm.id}
                                    className="flex-1 cursor-pointer text-sm"
                                  >
                                    <span className="font-medium">{perm.name}</span>
                                    {perm.description && (
                                      <span className="text-muted-foreground ml-2">
                                        — {perm.description}
                                      </span>
                                    )}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </ScrollArea>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving || isLoading}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Papel'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
