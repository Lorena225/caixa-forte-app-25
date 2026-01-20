import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Network, FolderTree, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const modules = [
  {
    title: 'Estrutura Organizacional',
    description: 'Gerencie a hierarquia de empresas, unidades e filiais',
    icon: Network,
    route: '/operacional/estrutura',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    title: 'Centros de Custódia',
    description: 'Administre centros de custo e suas vinculações',
    icon: FolderTree,
    route: '/operacional/centros-custodia',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    title: 'Seções e Departamentos',
    description: 'Cadastre e gerencie departamentos da empresa',
    icon: Building2,
    route: '/operacional/departamentos',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    title: 'Responsáveis por Centro de Custo',
    description: 'Defina responsáveis e períodos de vigência',
    icon: Users,
    route: '/operacional/responsaveis',
    color: 'bg-orange-500/10 text-orange-600',
  },
];

export default function OperacionalIndex() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <BackButton />
          <div className="flex-1">
            <PageHeader
              title="Módulo Operacional"
              description="Gestão de estrutura organizacional, departamentos e centros de custo"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <Card
              key={module.route}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(module.route)}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-3 rounded-lg ${module.color}`}>
                  <module.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
