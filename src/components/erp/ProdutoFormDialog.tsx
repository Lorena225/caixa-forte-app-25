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
import { Loader2, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const produtoSchema = z.object({
  tipo: z.enum(['P', 'S']),
  descricao: z.string().min(2, 'Descrição é obrigatória'),
  descricao_completa: z.string().optional().nullable(),
  ean: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  preco_venda: z.number().min(0).optional().nullable(),
  preco_custo: z.number().min(0).optional().nullable(),
  markup_percentual: z.number().optional().nullable(),
  controla_estoque: z.boolean().optional().nullable(),
  estoque_minimo: z.number().min(0).optional().nullable(),
  estoque_maximo: z.number().min(0).optional().nullable(),
  localizacao: z.string().optional().nullable(),
  peso_bruto: z.number().min(0).optional().nullable(),
  peso_liquido: z.number().min(0).optional().nullable(),
  ncm: z.string().optional().nullable(),
  cest: z.string().optional().nullable(),
  origem: z.number().optional().nullable(),
  cfop_padrao: z.string().optional().nullable(),
  aliquota_icms: z.number().min(0).max(100).optional().nullable(),
  aliquota_pis: z.number().min(0).max(100).optional().nullable(),
  aliquota_cofins: z.number().min(0).max(100).optional().nullable(),
  aliquota_ipi: z.number().min(0).max(100).optional().nullable(),
  aliquota_iss: z.number().min(0).max(100).optional().nullable(),
  cst_icms: z.string().optional().nullable(),
  cst_pis: z.string().optional().nullable(),
  cst_cofins: z.string().optional().nullable(),
  situacao: z.enum(['A', 'I']),
  destaque: z.boolean().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

type ProdutoFormData = z.infer<typeof produtoSchema>;

interface ProdutoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: Produto | null;
  empresaId: string;
}

export function ProdutoFormDialog({
  open,
  onOpenChange,
  produto,
  empresaId,
}: ProdutoFormDialogProps) {
  const [activeTab, setActiveTab] = useState('dados');
  const createProduto = useCreateProduto();
  const updateProduto = useUpdateProduto();
  const isEditing = !!produto;

  const form = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      tipo: 'P',
      unidade: 'UN',
      situacao: 'A',
      controla_estoque: true,
      destaque: false,
    },
  });

  const tipo = form.watch('tipo');

  useEffect(() => {
    if (produto) {
      form.reset({
        tipo: produto.tipo,
        descricao: produto.descricao,
        descricao_completa: produto.descricao_completa,
        ean: produto.ean,
        referencia: produto.referencia,
        unidade: produto.unidade,
        preco_venda: produto.preco_venda,
        preco_custo: produto.preco_custo,
        markup_percentual: produto.markup_percentual,
        controla_estoque: produto.controla_estoque,
        estoque_minimo: produto.estoque_minimo,
        estoque_maximo: produto.estoque_maximo,
        localizacao: produto.localizacao,
        peso_bruto: produto.peso_bruto,
        peso_liquido: produto.peso_liquido,
        ncm: produto.ncm,
        cest: produto.cest,
        origem: produto.origem,
        cfop_padrao: produto.cfop_padrao,
        aliquota_icms: produto.aliquota_icms,
        aliquota_pis: produto.aliquota_pis,
        aliquota_cofins: produto.aliquota_cofins,
        aliquota_ipi: produto.aliquota_ipi,
        aliquota_iss: produto.aliquota_iss,
        cst_icms: produto.cst_icms,
        cst_pis: produto.cst_pis,
        cst_cofins: produto.cst_cofins,
        situacao: produto.situacao,
        destaque: produto.destaque,
        observacoes: produto.observacoes,
      });
    } else {
      form.reset({
        tipo: 'P',
        unidade: 'UN',
        situacao: 'A',
        controla_estoque: true,
        destaque: false,
      });
    }
  }, [produto, form]);

  const onSubmit = async (data: ProdutoFormData) => {
    try {
      if (isEditing && produto) {
        await updateProduto.mutateAsync({ id: produto.id, ...data });
      } else {
        await createProduto.mutateAsync({ ...data, empresa_id: empresaId } as any);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createProduto.isPending || updateProduto.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="precos">Preços</TabsTrigger>
                <TabsTrigger value="estoque">Estoque</TabsTrigger>
                <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
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
                            <SelectItem value="P">Produto</SelectItem>
                            <SelectItem value="S">Serviço</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ean"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Barras (EAN)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          SKU / Referência
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button" className="cursor-help">
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[250px]">
                                <p className="text-sm">
                                  Código interno único para identificar o produto. 
                                  Use padrões como "ELET-001" ou "CAM-AZUL-M" para facilitar buscas.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: ELET-001" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
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

                <div className="grid grid-cols-3 gap-4">
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
                            <SelectItem value="UN">UN - Unidade</SelectItem>
                            <SelectItem value="PC">PC - Peça</SelectItem>
                            <SelectItem value="KG">KG - Quilograma</SelectItem>
                            <SelectItem value="M">M - Metro</SelectItem>
                            <SelectItem value="M2">M² - Metro Quadrado</SelectItem>
                            <SelectItem value="M3">M³ - Metro Cúbico</SelectItem>
                            <SelectItem value="L">L - Litro</SelectItem>
                            <SelectItem value="CX">CX - Caixa</SelectItem>
                            <SelectItem value="HR">HR - Hora</SelectItem>
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

                  <FormField
                    control={form.control}
                    name="destaque"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 pt-8">
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <Label>Produto em Destaque</Label>
                      </FormItem>
                    )}
                  />
                </div>

                {tipo === 'P' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="peso_bruto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso Bruto (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
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
                      name="peso_liquido"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso Líquido (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
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
                )}
              </TabsContent>

              <TabsContent value="precos" className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="preco_custo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Custo (R$)</FormLabel>
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
                    name="markup_percentual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Markup (%)</FormLabel>
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
                        <Textarea rows={4} {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="estoque" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="controla_estoque"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <Label>Controlar Estoque</Label>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="estoque_minimo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          Estoque Mínimo
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button" className="cursor-help">
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[280px]">
                                <p className="text-sm">
                                  Quantidade de segurança que dispara alerta de reposição.
                                  Fórmula sugerida: Consumo Médio Diário × Lead Time × 1,5
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 10"
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
                    name="estoque_maximo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque Máximo</FormLabel>
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
                    name="localizacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localização</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="ncm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NCM</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000000"
                            maxLength={8}
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEST</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0000000"
                            maxLength={7}
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="origem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origem</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v))}
                          value={field.value?.toString() || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">0 - Nacional</SelectItem>
                            <SelectItem value="1">1 - Estrangeira (importação direta)</SelectItem>
                            <SelectItem value="2">2 - Estrangeira (mercado interno)</SelectItem>
                            <SelectItem value="3">3 - Nacional (40% a 70% importado)</SelectItem>
                            <SelectItem value="4">4 - Nacional (básicos)</SelectItem>
                            <SelectItem value="5">5 - Nacional (&lt; 40% importado)</SelectItem>
                            <SelectItem value="6">6 - Estrangeira (sem similar)</SelectItem>
                            <SelectItem value="7">7 - Estrangeira (similar + mercado)</SelectItem>
                            <SelectItem value="8">8 - Nacional (&gt; 70% importado)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cfop_padrao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CFOP Padrão</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="5102"
                            maxLength={4}
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cst_icms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CST ICMS</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aliquota_icms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alíquota ICMS (%)</FormLabel>
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

                  <FormField
                    control={form.control}
                    name="aliquota_ipi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alíquota IPI (%)</FormLabel>
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

                  {tipo === 'S' && (
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
                  )}
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
                {isEditing ? 'Salvar' : 'Criar Produto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
