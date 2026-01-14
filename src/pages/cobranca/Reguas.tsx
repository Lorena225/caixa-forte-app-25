import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Bell, Mail, MessageSquare, Phone, Edit, Trash2, ArrowRight } from 'lucide-react';

// Mock data
const mockReguas = [
  {
    id: '1',
    nome: 'Régua Padrão',
    descricao: 'Régua de cobrança padrão para todos os clientes',
    ativa: true,
    etapas: [
      { dias: -3, tipo: 'email', mensagem: 'Lembrete de vencimento' },
      { dias: 0, tipo: 'email', mensagem: 'Boleto vence hoje' },
      { dias: 3, tipo: 'whatsapp', mensagem: 'Primeiro aviso de atraso' },
      { dias: 7, tipo: 'sms', mensagem: 'Segundo aviso de atraso' },
      { dias: 15, tipo: 'telefone', mensagem: 'Contato telefônico' },
      { dias: 30, tipo: 'email', mensagem: 'Aviso de negativação' },
    ],
  },
  {
    id: '2',
    nome: 'Régua VIP',
    descricao: 'Régua para clientes VIP com menos notificações',
    ativa: true,
    etapas: [
      { dias: -1, tipo: 'email', mensagem: 'Lembrete gentil' },
      { dias: 5, tipo: 'whatsapp', mensagem: 'Aviso amigável' },
      { dias: 15, tipo: 'telefone', mensagem: 'Ligação cordial' },
    ],
  },
  {
    id: '3',
    nome: 'Régua Agressiva',
    descricao: 'Para clientes com histórico de inadimplência',
    ativa: false,
    etapas: [
      { dias: -5, tipo: 'email', mensagem: 'Lembrete antecipado' },
      { dias: -1, tipo: 'whatsapp', mensagem: 'Último dia para pagamento' },
      { dias: 1, tipo: 'sms', mensagem: 'Título em atraso' },
      { dias: 3, tipo: 'telefone', mensagem: 'Cobrança ativa' },
      { dias: 7, tipo: 'email', mensagem: 'Aviso de protesto' },
      { dias: 10, tipo: 'telefone', mensagem: 'Última tentativa' },
      { dias: 15, tipo: 'email', mensagem: 'Negativação imediata' },
    ],
  },
];

const tipoIcone: Record<string, any> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Phone,
  telefone: Phone,
};

const tipoCor: Record<string, string> = {
  email: 'bg-blue-100 text-blue-800',
  whatsapp: 'bg-green-100 text-green-800',
  sms: 'bg-purple-100 text-purple-800',
  telefone: 'bg-orange-100 text-orange-800',
};

export default function Reguas() {
  const [reguas, setReguas] = useState(mockReguas);

  const toggleRegua = (id: string) => {
    setReguas(prev => prev.map(r => 
      r.id === id ? { ...r, ativa: !r.ativa } : r
    ));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Réguas de Cobrança"
          description="Configure automações de lembretes e notificações"
        />

        <div className="flex justify-end">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Régua
          </Button>
        </div>

        <div className="grid gap-6">
          {reguas.map((regua) => (
            <Card key={regua.id} className={!regua.ativa ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {regua.nome}
                        <Badge variant={regua.ativa ? 'default' : 'secondary'}>
                          {regua.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{regua.descricao}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={regua.ativa}
                      onCheckedChange={() => toggleRegua(regua.id)}
                    />
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  {regua.etapas.map((etapa, index) => {
                    const Icon = tipoIcone[etapa.tipo];
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <Badge className={tipoCor[etapa.tipo]} variant="secondary">
                            <Icon className="h-3 w-3 mr-1" />
                            {etapa.dias > 0 ? `D+${etapa.dias}` : etapa.dias === 0 ? 'D' : `D${etapa.dias}`}
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-1 max-w-[80px] text-center truncate">
                            {etapa.mensagem}
                          </span>
                        </div>
                        {index < regua.etapas.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {reguas.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma régua configurada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie sua primeira régua de cobrança para automatizar lembretes e notificações.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Régua
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
