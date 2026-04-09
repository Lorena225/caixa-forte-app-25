import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2, XCircle, ExternalLink, RefreshCw,
  Sheet, Calendar, Info, Loader2
} from 'lucide-react';
import { useGoogleIntegration } from '@/hooks/useGoogleIntegration';
import { useTimeTracking } from '@/hooks/hcm/useTimeTracking';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { useAuth } from '@/contexts/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function GoogleIntegracao() {
  const { connected, tokens, loading, connect, disconnect, syncPontoToSheets, upsertCalendarEvent } = useGoogleIntegration();
  const { timeSummary } = useTimeTracking();
  const { employees } = useEmployees();
  const { session } = useAuth();

  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem('google_sheets_id') || '');
  const [calendarId, setCalendarId] = useState(localStorage.getItem('google_calendar_id') || 'primary');
  const [syncLoading, setSyncLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const saveSheetId = () => {
    localStorage.setItem('google_sheets_id', spreadsheetId);
  };
  const saveCalendarId = () => {
    localStorage.setItem('google_calendar_id', calendarId);
  };

  const handleSyncAllPonto = async () => {
    if (!spreadsheetId) return;
    saveSheetId();
    setSyncLoading(true);
    for (const emp of employees) {
      const records = timeSummary.filter(t => t.employee_id === emp.id);
      if (records.length > 0) {
        await syncPontoToSheets(spreadsheetId, emp.full_name, records);
      }
    }
    setSyncLoading(false);
  };

  const handleTestCalendar = async () => {
    saveCalendarId();
    setTestLoading(true);
    await upsertCalendarEvent(calendarId, {
      summary: 'Teste — Vitrio Integração',
      description: 'Evento de teste criado pelo sistema Vitrio.',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600_000).toISOString(),
      colorId: '2',
    });
    setTestLoading(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integração Google</h1>
            <p className="text-muted-foreground">Google Sheets e Google Calendar conectados ao sistema</p>
          </div>
          {connected ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Conectado{tokens?.email ? ` — ${tokens.email}` : ''}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3.5 w-3.5" /> Desconectado
            </Badge>
          )}
        </div>

        {!GOOGLE_CLIENT_ID && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure <code className="font-mono text-xs bg-muted px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> e{' '}
              <code className="font-mono text-xs bg-muted px-1 rounded">VITE_GOOGLE_CLIENT_SECRET</code> no arquivo{' '}
              <code className="font-mono text-xs bg-muted px-1 rounded">.env</code> para ativar a integração.{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5">
                Criar credenciais <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* Conexão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conta Google</CardTitle>
            <CardDescription>Autorize o acesso ao Google Sheets e Google Calendar</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            {connected ? (
              <Button variant="destructive" size="sm" onClick={disconnect}>
                <XCircle className="h-4 w-4 mr-2" /> Desconectar
              </Button>
            ) : (
              <Button onClick={connect} disabled={!GOOGLE_CLIENT_ID}>
                <RefreshCw className="h-4 w-4 mr-2" /> Conectar com Google
              </Button>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="sheets">
          <TabsList>
            <TabsTrigger value="sheets" className="gap-2">
              <Sheet className="h-4 w-4" /> Google Sheets
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" /> Google Calendar
            </TabsTrigger>
            <TabsTrigger value="como-configurar">Como configurar</TabsTrigger>
          </TabsList>

          {/* Sheets */}
          <TabsContent value="sheets">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sheet className="h-4 w-4 text-green-600" /> Sincronizar Ponto com Google Sheets
                </CardTitle>
                <CardDescription>
                  Os registros de ponto de todos os colaboradores serão enviados para sua planilha.
                  Cada colaborador terá sua própria aba.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>ID da Planilha Google Sheets</Label>
                  <Input
                    placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    value={spreadsheetId}
                    onChange={e => setSpreadsheetId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre o ID na URL da planilha: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSyncAllPonto}
                    disabled={!connected || !spreadsheetId || syncLoading || loading}
                  >
                    {syncLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sheet className="h-4 w-4 mr-2" />}
                    Sincronizar todos os colaboradores
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : '#'}
                      target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Abrir planilha
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {employees.length} colaborador(es) | {timeSummary.length} registros de ponto no sistema
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" /> Configurar Google Calendar
                </CardTitle>
                <CardDescription>
                  O módulo de Projetos usará este calendário para criar e sincronizar eventos automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>ID do Calendário</Label>
                  <Input
                    placeholder="primary (padrão) ou email@google.com"
                    value={calendarId}
                    onChange={e => setCalendarId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code className="font-mono text-xs bg-muted px-1 rounded">primary</code> para o calendário principal,
                    ou o e-mail de um calendário específico.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveCalendarId} variant="outline">
                    Salvar ID
                  </Button>
                  <Button
                    onClick={handleTestCalendar}
                    disabled={!connected || testLoading}
                  >
                    {testLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                    Criar evento de teste
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Abrir Calendar
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Como configurar */}
          <TabsContent value="como-configurar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Passo a passo para configurar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                  <li>
                    Acesse o{' '}
                    <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
                      className="text-primary underline">Google Cloud Console</a>
                    {' '}e crie um projeto
                  </li>
                  <li>
                    Vá em <strong>APIs e Serviços → Credenciais → Criar Credenciais → ID do cliente OAuth</strong>
                  </li>
                  <li>
                    Selecione <strong>Aplicativo da Web</strong> e adicione a URI de redirecionamento autorizada:{' '}
                    <code className="font-mono bg-muted px-1 rounded">https://www.erpvitrio.com.br/google-callback</code>
                  {' e '}
                  <code className="font-mono bg-muted px-1 rounded">http://localhost:8080/google-callback</code>
                  </li>
                  <li>
                    Ative as APIs: <strong>Google Sheets API</strong> e <strong>Google Calendar API</strong>
                  </li>
                  <li>
                    Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong> gerados
                  </li>
                  <li>
                    Adicione ao arquivo <code className="font-mono bg-muted px-1 rounded">.env</code>:
                    <pre className="mt-2 bg-muted rounded p-3 text-xs overflow-auto">
{`VITE_GOOGLE_CLIENT_ID=seu_client_id_aqui
VITE_GOOGLE_CLIENT_SECRET=seu_client_secret_aqui`}
                    </pre>
                  </li>
                  <li>Reinicie o servidor (<code className="font-mono bg-muted px-1 rounded">npm run dev</code>) e clique em <strong>Conectar com Google</strong></li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
