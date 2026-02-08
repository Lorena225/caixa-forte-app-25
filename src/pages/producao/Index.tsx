import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Factory, 
  ClipboardList, 
  Cog, 
  Calculator, 
  Route as RouteIcon, 
  Package,
  FileText,
  BarChart3
} from "lucide-react";

const modules = [
  {
    title: 'Ordens de Produção',
    description: 'Gerencie OPs, apontamentos e acompanhe o chão de fábrica',
    icon: Factory,
    route: '/producao/ordens',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    title: 'Kanban de Produção',
    description: 'Visualização Kanban do status das Ordens de Produção',
    icon: Package,
    route: '/producao/kanban',
    color: 'bg-indigo-500/10 text-indigo-600',
  },
  {
    title: 'Chão de Fábrica',
    description: 'Interface tablet para apontamento de produção',
    icon: ClipboardList,
    route: '/producao/chao-fabrica',
    color: 'bg-teal-500/10 text-teal-600',
  },
  {
    title: 'Engenharia de Produto',
    description: 'Cadastre BOMs (estrutura de produto) e roteiros de fabricação',
    icon: Cog,
    route: '/producao/engenharia',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    title: 'MRP - Planejamento',
    description: 'Execute o cálculo de necessidades de materiais',
    icon: Calculator,
    route: '/producao/mrp',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    title: 'Centros de Trabalho',
    description: 'Configure máquinas, mão de obra e custos hora',
    icon: RouteIcon,
    route: '/producao/centros-trabalho',
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    title: 'Requisições de Compra',
    description: 'Gerencie solicitações geradas pelo MRP',
    icon: FileText,
    route: '/producao/requisicoes',
    color: 'bg-yellow-500/10 text-yellow-600',
  },
  {
    title: 'Custeio Industrial',
    description: 'Análise de variações e custos de produção',
    icon: BarChart3,
    route: '/producao/custeio',
    color: 'bg-red-500/10 text-red-600',
  },
];

export default function ProducaoIndex() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex-1">
          <PageHeader
            title="PCP & MRP"
            description="Planejamento e Controle da Produção - Gestão Industrial"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card
              key={module.route}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
              onClick={() => navigate(module.route)}
            >
              <CardHeader className="pb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${module.color}`}>
                  <module.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
