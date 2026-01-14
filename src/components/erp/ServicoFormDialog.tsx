import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Produto, useCreateProduto, useUpdateProduto } from '@/hooks/useProdutos';
import { Loader2 } from 'lucide-react';

const servicoSchema = z.object({
  descricao: z.string().min(2, 'Descrição é obrigatória'),
  descricao_completa: z.string().optional().nullable(),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  preco_venda: z.number().min(0).optional().nullable(),
  preco_custo: z.number().min(0).optional().nullable(),
  codigo_servico: z.string().optional().nullable(),
  aliquota_iss: z.number().min(0).max(100).optional().nullable(),
  aliquota_pis: z.number().min(0).max(100).optional().nullable(),
  aliquota_cofins: z.number().min(0).max(100).optional().nullable(),
  cst_pis: z.string().optional().nullable(),
  cst_cofins: z.string().optional().nullable(),
  situacao: z.enum(['A', 'I']),
  destaque: z.boolean().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

type ServicoFormData = z.infer<typeof servicoSchema>;

interface ServicoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servico?: Produto | null;
  empresaId: string;
}

export function ServicoFormDialog({
  open,
  onOpenChange,
  servico,
  empresaId,
}: ServicoFormDialogProps) {
  const [activeTab, setActiveTab] = useState('dados');
  const createProduto = useCreateProduto();
  const updateProduto = useUpdateProduto();
  const isEditing = !!servico;

  const form = useForm<ServicoFormData>({
    resolver: zodResolver(servicoSchema),
    defaultValues: {
      unidade: 'HR',
      situacao: 'A',
      destaque: false,
    },
  });

  useEffect(() => {
    if (servico) {
      form.reset({
        descricao: servico.descricao,
        descricao_completa: servico.descricao_completa,
        unidade: servico.unidade,
        preco_venda: servico.preco_venda,
        preco_custo: servico.preco_custo,
        codigo_servico: servico.codigo_servico,
        aliquota_iss: servico.aliquota_iss,
        aliquota_pis: servico.aliquota_pis,
        aliquota_cofins: servico.aliquota_cofins,
        cst_pis: servico.cst_pis,
        cst_cofins: servico.cst_cofins,
        situacao: servico.situacao,
        destaque: servico.destaque,
        observacoes: servico.observacoes,
      });
    } else {
      form.reset({
        unidade: 'HR',
        situacao: 'A',
        destaque: false,
      });
    }
  }, [servico, form]);

  const onSubmit = async (data: ServicoFormData) => {
    try {
      const payload = {
        ...data,
        tipo: 'S' as const,
        controla_estoque: false,
      };

      if (isEditing && servico) {
        await updateProduto.mutateAsync({ id: servico.id, ...payload });
      } else {
        await createProduto.mutateAsync({ ...payload, empresa_id: empresaId } as any);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createProduto.isPending || updateProduto.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="precos">Preços</TabsTrigger>
                <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Serviço</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao_completa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição Completa</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="HR">HR - Hora</SelectItem>
                            <SelectItem value="UN">UN - Unidade</SelectItem>
                            <SelectItem value="SV">SV - Serviço</SelectItem>
                            <SelectItem value="M2">M² - Metro Quadrado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="situacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situação</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A">Ativo</SelectItem>
                            <SelectItem value="I">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="destaque"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <Label>Serviço em Destaque</Label>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="precos" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="preco_custo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custo (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preco_venda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Venda (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="codigo_servico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Serviço Municipal</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Ex: 01.07" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aliquota_iss"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alíquota ISS (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="aliquota_pis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alíquota PIS (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aliquota_cofins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alíquota COFINS (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cst_pis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CST PIS</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="01">01 - Operação Tributável</SelectItem>
                            <SelectItem value="04">04 - Operação Tributável - ST</SelectItem>
                            <SelectItem value="06">06 - Operação Tributável - Alíquota Zero</SelectItem>
                            <SelectItem value="07">07 - Operação Isenta</SelectItem>
                            <SelectItem value="08">08 - Operação sem Incidência</SelectItem>
                            <SelectItem value="09">09 - Operação com Suspensão</SelectItem>
                            <SelectItem value="49">49 - Outras Operações de Saída</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cst_cofins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CST COFINS</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="01">01 - Operação Tributável</SelectItem>
                            <SelectItem value="04">04 - Operação Tributável - ST</SelectItem>
                            <SelectItem value="06">06 - Operação Tributável - Alíquota Zero</SelectItem>
                            <SelectItem value="07">07 - Operação Isenta</SelectItem>
                            <SelectItem value="08">08 - Operação sem Incidência</SelectItem>
                            <SelectItem value="09">09 - Operação com Suspensão</SelectItem>
                            <SelectItem value="49">49 - Outras Operações de Saída</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
