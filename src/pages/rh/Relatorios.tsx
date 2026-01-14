import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Users, DollarSign, Calendar, Gift } from 'lucide-react';

const relatorios = [
  {
    titulo: 'Folha Analítica',
    descricao: 'Detalhamento completo da folha de pagamento por funcionário',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    titulo: 'Resumo de Encargos',
    descricao: 'INSS, FGTS e IRRF consolidados',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    titulo: 'Funcionários por Departamento',
    descricao: 'Listagem organizada por estrutura',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    titulo: 'Férias Vencidas/Vencendo',
    descricao: 'Períodos aquisitivos e pendências',
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    titulo: 'Benefícios por Funcionário',
    descricao: 'Custos e descontos de benefícios',
    icon: Gift,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    titulo: 'Histórico de Admissões/Demissões',
    descricao: 'Movimentações de pessoal',
    icon: Users,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
];

export default function RHRelatorios() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Relatórios RH</h1>
          <p className="text-muted-foreground">Relatórios e análises de recursos humanos</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relatorios.map((rel) => (
            <Card key={rel.titulo} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${rel.bgColor}`}>
                    <rel.icon className={`h-5 w-5 ${rel.color}`} />
                  </div>
                  <CardTitle className="text-base">{rel.titulo}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{rel.descricao}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Visualizar
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
