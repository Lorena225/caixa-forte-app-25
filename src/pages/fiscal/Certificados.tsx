import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Shield, AlertTriangle, CheckCircle, Clock, Key, FileKey, RefreshCw } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data - substituir por dados reais do Supabase
const mockCertificados = [
  {
    id: '1',
    tipo: 'A1',
    razao_social: 'Empresa Exemplo LTDA',
    cnpj: '12.345.678/0001-90',
    validade_inicio: '2024-01-15',
    validade_fim: '2025-01-15',
    status: 'ativo',
    serial_number: 'ABC123DEF456',
    emissor: 'AC VALID',
  },
  {
    id: '2',
    tipo: 'A3',
    razao_social: 'Filial Norte',
    cnpj: '12.345.678/0002-71',
    validade_inicio: '2023-06-01',
    validade_fim: '2026-06-01',
    status: 'ativo',
    serial_number: 'XYZ789GHI012',
    emissor: 'SERASA',
  },
];

export default function Certificados() {
  const [certificados] = useState(mockCertificados);
  const [uploading, setUploading] = useState(false);

  const getDaysRemaining = (validadeFim: string) => {
    return differenceInDays(new Date(validadeFim), new Date());
  };

  const getStatusBadge = (validadeFim: string) => {
    const days = getDaysRemaining(validadeFim);
    if (days < 0) return <Badge variant="destructive">Expirado</Badge>;
    if (days <= 30) return <Badge className="bg-red-100 text-red-800">Expira em {days} dias</Badge>;
    if (days <= 90) return <Badge className="bg-yellow-100 text-yellow-800">Expira em {days} dias</Badge>;
    return <Badge className="bg-green-100 text-green-800">Válido</Badge>;
  };

  const getExpirationProgress = (validadeFim: string, validadeInicio: string) => {
    const totalDays = differenceInDays(new Date(validadeFim), new Date(validadeInicio));
    const daysRemaining = getDaysRemaining(validadeFim);
    const daysUsed = totalDays - daysRemaining;
    return Math.min(100, Math.max(0, (daysUsed / totalDays) * 100));
  };

  const certificadosExpirando = certificados.filter(c => getDaysRemaining(c.validade_fim) <= 30 && getDaysRemaining(c.validade_fim) > 0);
  const certificadosExpirados = certificados.filter(c => getDaysRemaining(c.validade_fim) < 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Certificados Digitais"
          description="Gerenciamento de certificados A1/A3 para emissão de documentos fiscais"
        />

        {/* Alertas */}
        {certificadosExpirados.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Certificados Expirados</AlertTitle>
            <AlertDescription>
              Você tem {certificadosExpirados.length} certificado(s) expirado(s). 
              Renove-os para continuar emitindo documentos fiscais.
            </AlertDescription>
          </Alert>
        )}

        {certificadosExpirando.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Atenção</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Você tem {certificadosExpirando.length} certificado(s) expirando nos próximos 30 dias.
            </AlertDescription>
          </Alert>
        )}

        {/* Ações */}
        <div className="flex gap-4">
          <Button onClick={() => setUploading(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Certificado A1
          </Button>
          <Button variant="outline">
            <Key className="h-4 w-4 mr-2" />
            Configurar Certificado A3
          </Button>
        </div>

        {/* Lista de Certificados */}
        <div className="grid gap-4">
          {certificados.map((cert) => {
            const daysRemaining = getDaysRemaining(cert.validade_fim);
            const progress = getExpirationProgress(cert.validade_fim, cert.validade_inicio);
            
            return (
              <Card key={cert.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {cert.tipo === 'A1' ? (
                          <FileKey className="h-6 w-6 text-primary" />
                        ) : (
                          <Shield className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cert.razao_social}</CardTitle>
                        <CardDescription>CNPJ: {cert.cnpj}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Tipo {cert.tipo}</Badge>
                      {getStatusBadge(cert.validade_fim)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Emissor:</span>
                      <p className="font-medium">{cert.emissor}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Número de Série:</span>
                      <p className="font-medium font-mono text-xs">{cert.serial_number}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Validade:</span>
                      <p className="font-medium">
                        {format(new Date(cert.validade_inicio), 'dd/MM/yyyy', { locale: ptBR })} até{' '}
                        {format(new Date(cert.validade_fim), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tempo de uso</span>
                      <span className={daysRemaining <= 30 ? 'text-red-600 font-medium' : ''}>
                        {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Expirado'}
                      </span>
                    </div>
                    <Progress 
                      value={progress} 
                      className={daysRemaining <= 30 ? '[&>div]:bg-red-500' : ''}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Renovar
                    </Button>
                    <Button variant="ghost" size="sm">
                      Testar Conexão
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {certificados.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum certificado cadastrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Importe um certificado digital A1 ou configure um certificado A3 para começar a emitir documentos fiscais.
              </p>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Importar Certificado
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
