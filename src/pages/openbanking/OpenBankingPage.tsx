import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Globe, 
  Building2, 
  CheckCircle, 
  RefreshCw,
  Clock,
  Link2,
  Plus,
  Shield
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
  { id: 'itau', nome: 'Itaú', codigo: '341', cor: '#003399' },
  { id: 'caixa', nome: 'Caixa Econômica', codigo: '104', cor: '#0066B3' },
  { id: 'santander', nome: 'Santander', codigo: '033', cor: '#EC0000' },
  { id: 'nubank', nome: 'Nubank', codigo: '260', cor: '#820AD1' },
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
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConectar = (bancoId: string) => {
    setConnecting(bancoId);
    
    setTimeout(() => {
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
      setConnecting(null);
      toast.success(`Conectado ao ${conexoes.find(c => c.id === bancoId)?.nome} via Open Banking!`);
    }, 1500);
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

  const connectedCount = conexoes.filter(c => c.conectado).length;
  const availableCount = conexoes.filter(c => !c.conectado).length;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader 
          title="Open Banking - Conexão com Bancos" 
          description="Sincronize suas contas bancárias automaticamente via Open Banking Brasil"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bancos Conectados</p>
                  <p className="text-2xl font-bold font-mono">{connectedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disponíveis</p>
                  <p className="text-2xl font-bold font-mono">{availableCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Sincronização</p>
                  <p className="text-2xl font-bold font-mono">Há 2 min</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grid de Bancos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conexoes.map((banco) => (
            <Card 
              key={banco.id}
              className={cn(
                'transition-all duration-200 overflow-hidden',
                banco.conectado && 'ring-2 ring-green-500 ring-offset-2'
              )}
            >
              {/* Color Bar */}
              <div className="h-2" style={{ backgroundColor: banco.cor }} />
              
              <CardContent className="p-6">
                {/* Header do Banco */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                      style={{ backgroundColor: banco.cor }}
                    >
                      {banco.codigo}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{banco.nome}</h3>
                      <p className="text-sm text-muted-foreground">Código: {banco.codigo}</p>
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                      <Clock className="h-4 w-4" />
                      Última sync: {banco.ultimaSync}
                    </div>

                    {/* Checkboxes de Contas */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Contas sincronizadas:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                          <Checkbox 
                            id={`${banco.id}-corrente`}
                            checked={banco.contas.corrente}
                            onCheckedChange={() => toggleConta(banco.id, 'corrente')}
                          />
                          <label htmlFor={`${banco.id}-corrente`} className="text-sm cursor-pointer">
                            Conta Corrente
                          </label>
                        </div>
                        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                          <Checkbox 
                            id={`${banco.id}-poupanca`}
                            checked={banco.contas.poupanca}
                            onCheckedChange={() => toggleConta(banco.id, 'poupanca')}
                          />
                          <label htmlFor={`${banco.id}-poupanca`} className="text-sm cursor-pointer">
                            Conta Poupança
                          </label>
                        </div>
                        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors">
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
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                      disabled={connecting === banco.id}
                      className="w-full gap-2"
                      variant="outline"
                    >
                      {connecting === banco.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Conectar via Open Banking
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Box */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Sobre Open Banking</h3>
                <p className="text-sm text-blue-700">
                  O Open Banking é regulamentado pelo Banco Central e permite compartilhar seus dados bancários 
                  de forma segura. Suas credenciais nunca são armazenadas - utilizamos autenticação OAuth 2.0 
                  diretamente com seu banco.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
