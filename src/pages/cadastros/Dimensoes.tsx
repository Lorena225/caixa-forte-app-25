import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Plus, Layers, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Dimensoes() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [isDimensionDialogOpen, setIsDimensionDialogOpen] = useState(false);
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  
  const [dimensionForm, setDimensionForm] = useState({
    code: '',
    name: '',
    is_required: false
  });
  
  const [valueForm, setValueForm] = useState({
    code: '',
    name: ''
  });

  // Fetch dimensions
  const { data: dimensions, isLoading } = useQuery({
    queryKey: ['dimensions', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('dimensions')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  // Fetch dimension values
  const { data: dimensionValues } = useQuery({
    queryKey: ['dimension-values', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('dimension_values')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const createDimensionMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { error } = await supabase
        .from('dimensions')
        .insert({
          company_id: currentCompany.id,
          code: dimensionForm.code.toUpperCase(),
          name: dimensionForm.name,
          is_required: dimensionForm.is_required
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dimensions'] });
      setIsDimensionDialogOpen(false);
      setDimensionForm({ code: '', name: '', is_required: false });
      toast.success('Dimensão criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const createValueMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id || !selectedDimension) throw new Error('Dados inválidos');
      
      const { error } = await supabase
        .from('dimension_values')
        .insert({
          company_id: currentCompany.id,
          dimension_id: selectedDimension,
          code: valueForm.code.toUpperCase(),
          name: valueForm.name
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dimension-values'] });
      setIsValueDialogOpen(false);
      setValueForm({ code: '', name: '' });
      setSelectedDimension(null);
      toast.success('Valor criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const getValuesForDimension = (dimensionId: string) => {
    return dimensionValues?.filter(v => v.dimension_id === dimensionId) || [];
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="Dimensões Gerenciais"
          description="Centro de custo, projeto, unidade, departamento e outras dimensões"
        >
          <Dialog open={isDimensionDialogOpen} onOpenChange={setIsDimensionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Dimensão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Dimensão</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Código</Label>
                  <Input
                    value={dimensionForm.code}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, code: e.target.value })}
                    placeholder="Ex: PROJETO, FILIAL, DEPTO"
                  />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={dimensionForm.name}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, name: e.target.value })}
                    placeholder="Ex: Projeto, Filial, Departamento"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={dimensionForm.is_required}
                    onCheckedChange={(v) => setDimensionForm({ ...dimensionForm, is_required: v })}
                  />
                  <Label>Obrigatório em lançamentos</Label>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDimensionDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => createDimensionMutation.mutate()}
                    disabled={!dimensionForm.code || !dimensionForm.name}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Card>
          <CardContent className="pt-6">
            {dimensions && dimensions.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-2">
                {dimensions.map((dimension) => {
                  const values = getValuesForDimension(dimension.id);
                  return (
                    <AccordionItem key={dimension.id} value={dimension.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                            {dimension.code}
                          </span>
                          <span className="font-medium">{dimension.name}</span>
                          {dimension.is_required && (
                            <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                          )}
                          <Badge variant="outline" className="ml-auto">
                            {values.length} valores
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2">
                          <div className="flex justify-end mb-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDimension(dimension.id);
                                setIsValueDialogOpen(true);
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Adicionar Valor
                            </Button>
                          </div>
                          
                          {values.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Código</TableHead>
                                  <TableHead>Nome</TableHead>
                                  <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {values.map((value) => (
                                  <TableRow key={value.id}>
                                    <TableCell className="font-mono">{value.code}</TableCell>
                                    <TableCell>{value.name}</TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhum valor cadastrado para esta dimensão
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="text-center py-8">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma dimensão cadastrada
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Dimensões permitem classificar lançamentos por projeto, filial, departamento, etc.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para adicionar valor */}
        <Dialog open={isValueDialogOpen} onOpenChange={setIsValueDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Valor de Dimensão</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={valueForm.code}
                  onChange={(e) => setValueForm({ ...valueForm, code: e.target.value })}
                  placeholder="Ex: PROJ001, FILIAL-SP"
                />
              </div>
              <div>
                <Label>Nome</Label>
                <Input
                  value={valueForm.name}
                  onChange={(e) => setValueForm({ ...valueForm, name: e.target.value })}
                  placeholder="Ex: Projeto Alpha, Filial São Paulo"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsValueDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createValueMutation.mutate()}
                  disabled={!valueForm.code || !valueForm.name}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
