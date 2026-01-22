import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, 
  CheckCircle, 
  RefreshCw,
  Clock,
  Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Banco {
  id: string;
  nome: string;
  codigo: string;
  cor: string;
}

interface ConexaoBanco extends Banco {
  conectado: boolean;
  ultimaSync: string | null;
  contas: {
    corrente: boolean;
    poupanca: boolean;
    investimento: boolean;
  };
}

const bancosDisponiveis: Banco[] = [
  { id: 'bb', nome: 'Banco do Brasil', codigo: '001', cor: '#FFCC00' },
  { id: 'bradesco', nome: 'Bradesco', codigo: '237', cor: '#CC092F' },
  { id: 'itau', nome: 'Itaú', codigo: '341', cor: '#EC7000' },
  { id: 'caixa', nome: 'Caixa', codigo: '104', cor: '#005CA9' },
  { id: 'santander', nome: 'Santander', codigo: '033', cor: '#EC0000' },
  { id: 'nubank', nome: 'Nubank', codigo: '260', cor: '#8A05BE' },
];

export default function OpenBankingPage() {
  const [conexoes, setConexoes] = useState<ConexaoBanco[]>(
    bancosDisponiveis.map(b => ({
      ...b,
      conectado: false,
      ultimaSync: null,
      contas: { corrente: true, poupanca: false, investimento: false }
    }))
  );

  const handleConectar = (bancoId: string) => {
    setConexoes(prev => prev.map(c => {
      if (c.id === bancoId) {
        return {
          ...c,
          conectado: true,
          ultimaSync: 'Há 2 minutos',
        };
      }
      return c;
    }));
    toast.success(`Conectado ao ${conexoes.find(c => c.id === bancoId)?.nome} com sucesso!`);
  };

  const handleSincronizar = async (bancoId: string) => {
    const banco = conexoes.find(c => c.id === bancoId);
    toast.loading(`Sincronizando ${banco?.nome}...`, { id: bancoId });
    
    await new Promise(r => setTimeout(r, 1500));
    
    setConexoes(prev => prev.map(c => {
      if (c.id === bancoId) {
        return { ...c, ultimaSync: 'Agora mesmo' };
      }
      return c;
    }));
    
    toast.success(`Sincronização do ${banco?.nome} concluída!`, { id: bancoId });
  };

  const toggleConta = (bancoId: string, tipoConta: 'corrente' | 'poupanca' | 'investimento') => {
    setConexoes(prev => prev.map(c => {
      if (c.id === bancoId) {
        return {
          ...c,
          contas: { ...c.contas, [tipoConta]: !c.contas[tipoConta] }
        };
      }
      return c;
    }));
  };

  const handleDesconectar = (bancoId: string) => {
    setConexoes(prev => prev.map(c => {
      if (c.id === bancoId) {
        return { ...c, conectado: false, ultimaSync: null };
      }
      return c;
    }));
    toast.info(`Banco desconectado`);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="Conexão com Bancos (Open Banking)" />

        {/* Resumo */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {conexoes.filter(c => c.conectado).length} bancos conectados
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <Building2 className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {conexoes.filter(c => !c.conectado).length} disponíveis
            </span>
          </div>
        </div>

        {/* Grid de Bancos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conexoes.map((banco) => (
            <Card 
              key={banco.id}
              className={cn(
                'transition-all duration-200',
                banco.conectado && 'ring-2 ring-green-500 ring-offset-2'
              )}
            >
              <CardContent className="p-6">
                {/* Header do Banco */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: banco.cor }}
                    >
                      {banco.codigo}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{banco.nome}</h3>
                      <p className="text-sm text-gray-500">Código: {banco.codigo}</p>
                    </div>
                  </div>
                  {banco.conectado && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  )}
                </div>

                {/* Estado Conectado */}
                {banco.conectado ? (
                  <div className="space-y-4">
                    {/* Última Sync */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      Última sync: {banco.ultimaSync}
                    </div>

                    {/* Checkboxes de Contas */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Contas sincronizadas:</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`${banco.id}-corrente`}
                            checked={banco.contas.corrente}
                            onCheckedChange={() => toggleConta(banco.id, 'corrente')}
                          />
                          <label htmlFor={`${banco.id}-corrente`} className="text-sm cursor-pointer">
                            Conta Corrente
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`${banco.id}-poupanca`}
                            checked={banco.contas.poupanca}
                            onCheckedChange={() => toggleConta(banco.id, 'poupanca')}
                          />
                          <label htmlFor={`${banco.id}-poupanca`} className="text-sm cursor-pointer">
                            Conta Poupança
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`${banco.id}-investimento`}
                            checked={banco.contas.investimento}
                            onCheckedChange={() => toggleConta(banco.id, 'investimento')}
                          />
                          <label htmlFor={`${banco.id}-investimento`} className="text-sm cursor-pointer">
                            Investimentos
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => handleSincronizar(banco.id)}
                        className="flex-1 gap-1"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Sincronizar Agora
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDesconectar(banco.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Desconectar
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Estado Desconectado */
                  <div className="pt-4">
                    <Button 
                      onClick={() => handleConectar(banco.id)}
                      className="w-full gap-2"
                      variant="outline"
                    >
                      <Link2 className="h-4 w-4" />
                      Conectar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
