import { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import type { Role } from '@/types/permissions';

const inviteSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  full_name: z.string().max(100, 'Nome muito longo').optional(),
  role_id: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  roles: Role[];
  onInvite: (data: InviteFormData) => Promise<void>;
  onCancel: () => void;
}

export function InviteUserDialog({ open, roles, onInvite, onCancel }: InviteUserDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role_id: roles.find((r) => r.code === 'consultor')?.id || roles[0]?.id || '',
    },
  });

  const handleSubmit = async (data: InviteFormData) => {
    setIsSending(true);
    setSuccess(null);
    try {
      await onInvite(data);
      setSuccess(data.email);
      form.reset();
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    form.reset();
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Convidar Usuário
          </DialogTitle>
          <DialogDescription>
            Envie um convite por email para adicionar um novo usuário à empresa
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6">
            <Alert className="bg-success/10 border-success/20">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Convite enviado com sucesso para <strong>{success}</strong>
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button onClick={() => setSuccess(null)}>
                Enviar Outro
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="usuario@empresa.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do usuário (opcional)" {...field} />
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
                    <FormLabel>Papel Inicial</FormLabel>
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
                    <FormDescription className="text-xs">
                      O usuário poderá ter seu papel alterado posteriormente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Um email de convite será enviado com instruções para criar a conta
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSending}>
                  {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar Convite
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
