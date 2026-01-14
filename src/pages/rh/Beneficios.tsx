import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Gift, Bus, Utensils, Heart, Smile } from 'lucide-react';
import { useRH } from '@/hooks/useRH';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const tipoIcons: Record<string, React.ReactNode> = {
  vale_transporte: <Bus className="h-4 w-4" />,
  vale_refeicao: <Utensils className="h-4 w-4" />,
  vale_alimentacao: <Utensils className="h-4 w-4" />,
  plano_saude: <Heart className="h-4 w-4" />,
  plano_odonto: <Smile className="h-4 w-4" />,
  outro: <Gift className="h-4 w-4" />,
};

const tipoLabels: Record<string, string> = {
  vale_transporte: 'Vale Transporte',
  vale_refeicao: 'Vale Refeição',
  vale_alimentacao: 'Vale Alimentação',
  plano_saude: 'Plano de Saúde',
  plano_odonto: 'Plano Odontológico',
  seguro_vida: 'Seguro de Vida',
  auxilio_creche: 'Auxílio Creche',
  auxilio_educacao: 'Auxílio Educação',
  gympass: 'Gympass',
  outro: 'Outro',
};

export default function Beneficios() {
  const { beneficios, beneficiosLoading, createBeneficio } = useRH();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'outro',
    descricao: '',
    valor_padrao: '',
    desconto_funcionario_percentual: '',
    desconto_funcionario_fixo: '',
    fornecedor: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBeneficio.mutateAsync({
      nome: formData.nome,
      tipo: formData.tipo as any,
      descricao: formData.descricao || null,
      valor_padrao: parseFloat(formData.valor_padrao) || 0,
      desconto_funcionario_percentual: parseFloat(formData.desconto_funcionario_percentual) || 0,
      desconto_funcionario_fixo: parseFloat(formData.desconto_funcionario_fixo) || 0,
      fornecedor: formData.fornecedor || null,
    });
    setIsDialogOpen(false);
    setFormData({
      nome: '',
      tipo: 'outro',
      descricao: '',
      valor_padrao: '',
      desconto_funcionario_percentual: '',
      desconto_funcionario_fixo: '',
      fornecedor: '',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Benefícios</h1>
            <p className="text-muted-foreground">Gestão de benefícios corporativos</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Benefício
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Benefício</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={v => setFormData(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Padrão (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_padrao}
                      onChange={e => setFormData(p => ({ ...p, valor_padrao: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Input
                      value={formData.fornecedor}
                      onChange={e => setFormData(p => ({ ...p, fornecedor: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Desconto Funcionário (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      max="100"
                      value={formData.desconto_funcionario_percentual}
                      onChange={e => setFormData(p => ({ ...p, desconto_funcionario_percentual: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Desconto Fixo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.desconto_funcionario_fixo}
                      onChange={e => setFormData(p => ({ ...p, desconto_funcionario_fixo: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createBeneficio.isPending}>
                    {createBeneficio.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Benefícios Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benefício</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Desconto Func.</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beneficiosLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : beneficios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum benefício cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  beneficios.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {tipoIcons[b.tipo] || <Gift className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{b.nome}</p>
                            {b.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{b.descricao}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tipoLabels[b.tipo] || b.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(b.valor_padrao)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {b.desconto_funcionario_percentual > 0 
                          ? `${b.desconto_funcionario_percentual}%`
                          : b.desconto_funcionario_fixo > 0
                          ? formatCurrency(b.desconto_funcionario_fixo)
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground">{b.fornecedor || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={b.ativo ? 'default' : 'secondary'}>
                          {b.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
