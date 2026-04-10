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
import { CPFInput } from '@/components/common/CPFInput';
import { CNPJInput } from '@/components/common/CNPJInput';
import { Fornecedor, useCreateFornecedor, useUpdateFornecedor } from '@/hooks/useFornecedores';
import { Loader2 } from 'lucide-react';

const fornecedorSchema = z.object({
  tipo_pessoa: z.enum(['F', 'J']),
  cpf_cnpj: z.string().optional().nullable(),
  nome_razao: z.string().min(2, 'Nome é obrigatório'),
  nome_fantasia: z.string().optional().nullable(),
  inscricao_estadual: z.string().optional().nullable(),
  inscricao_municipal: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  telefone: z.string().optional().nullable(),
  celular: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  prazo_entrega_dias: z.number().min(0).optional().nullable(),
  banco: z.string().optional().nullable(),
  agencia: z.string().optional().nullable(),
  conta: z.string().optional().nullable(),
  pix_chave: z.string().optional().nullable(),
  pix_tipo: z.string().optional().nullable(),
  regime_tributario: z.number().optional().nullable(),
  contribuinte_icms: z.boolean().optional().nullable(),
  situacao: z.enum(['A', 'I']),
  observacoes: z.string().optional().nullable(),
});

type FornecedorFormData = z.infer<typeof fornecedorSchema>;

interface FornecedorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor?: Fornecedor | null;
  empresaId: string;
}

export function FornecedorFormDialog({
  open,
  onOpenChange,
  fornecedor,
  empresaId,
}: FornecedorFormDialogProps) {
  const [activeTab, setActiveTab] = useState('dados');
  const createFornecedor = useCreateFornecedor();
  const updateFornecedor = useUpdateFornecedor();
  const isEditing = !!fornecedor;

  const form = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      tipo_pessoa: 'J',
      situacao: 'A',
      contribuinte_icms: true,
    },
  });

  const tipoPessoa = form.watch('tipo_pessoa');

  useEffect(() => {
    if (fornecedor) {
      form.reset({
        tipo_pessoa: fornecedor.tipo_pessoa,
        cpf_cnpj: fornecedor.cpf_cnpj,
        nome_razao: fornecedor.nome_razao,
        nome_fantasia: fornecedor.nome_fantasia,
        inscricao_estadual: fornecedor.inscricao_estadual,
        inscricao_municipal: fornecedor.inscricao_municipal,
        email: fornecedor.email,
        telefone: fornecedor.telefone,
        celular: fornecedor.celular,
        whatsapp: fornecedor.whatsapp,
        cep: fornecedor.cep,
        logradouro: fornecedor.logradouro,
        numero: fornecedor.numero,
        complemento: fornecedor.complemento,
        bairro: fornecedor.bairro,
        cidade: fornecedor.cidade,
        uf: fornecedor.uf,
        prazo_entrega_dias: fornecedor.prazo_entrega_dias,
        banco: fornecedor.banco,
        agencia: fornecedor.agencia,
        conta: fornecedor.conta,
        pix_chave: fornecedor.pix_chave,
        pix_tipo: fornecedor.pix_tipo,
        regime_tributario: fornecedor.regime_tributario,
        contribuinte_icms: fornecedor.contribuinte_icms,
        situacao: fornecedor.situacao,
        observacoes: fornecedor.observacoes,
      });
    } else {
      form.reset({
        tipo_pessoa: 'J',
        situacao: 'A',
        contribuinte_icms: true,
      });
    }
  }, [fornecedor, form]);

  const onSubmit = async (data: FornecedorFormData) => {
    try {
      if (isEditing && fornecedor) {
        await updateFornecedor.mutateAsync({ id: fornecedor.id, ...data });
      } else {
        await createFornecedor.mutateAsync({ ...data, empresa_id: empresaId } as any);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createFornecedor.isPending || updateFornecedor.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="endereco">Endereço</TabsTrigger>
                <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
                <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tipo_pessoa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Pessoa</FormLabel>
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
                            <SelectItem value="J">Pessoa Jurídica</SelectItem>
                            <SelectItem value="F">Pessoa Física</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf_cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {tipoPessoa === 'F' ? 'CPF' : 'CNPJ'}
                        </FormLabel>
                        <FormControl>
                          {tipoPessoa === 'F' ? (
                            <CPFInput
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                          ) : (
                            <CNPJInput
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="nome_razao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipoPessoa === 'F' ? 'Nome Completo' : 'Razão Social'}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipoPessoa === 'J' && (
                  <FormField
                    control={form.control}
                    name="nome_fantasia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
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
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="celular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prazo_entrega_dias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo de Entrega (dias)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseInt(e.target.value) : null
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
              </TabsContent>

              <TabsContent value="endereco" className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name="logradouro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logradouro</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="uf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
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
                            {[
                              'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES',
                              'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR',
                              'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
                              'SP', 'SE', 'TO'
                            ].map((uf) => (
                              <SelectItem key={uf} value={uf}>
                                {uf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pagamento" className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="banco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="agencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agência</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="conta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pix_tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Chave PIX</FormLabel>
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
                            <SelectItem value="cpf">CPF</SelectItem>
                            <SelectItem value="cnpj">CNPJ</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="telefone">Telefone</SelectItem>
                            <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pix_chave"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave PIX</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
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
                        <Textarea
                          rows={4}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-4 pt-4">
                {tipoPessoa === 'J' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="inscricao_estadual"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inscrição Estadual</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inscricao_municipal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inscrição Municipal</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="regime_tributario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regime Tributário</FormLabel>
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
                          <SelectItem value="1">Simples Nacional</SelectItem>
                          <SelectItem value="2">
                            Simples Nacional - Excesso
                          </SelectItem>
                          <SelectItem value="3">Regime Normal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contribuinte_icms"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <Label>Contribuinte ICMS</Label>
                    </FormItem>
                  )}
                />
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
                {isEditing ? 'Salvar' : 'Criar Fornecedor'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
