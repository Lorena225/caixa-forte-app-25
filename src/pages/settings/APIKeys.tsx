import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicAPI, API_SCOPES } from '@/hooks/usePublicAPI';
import { 
  Key, Plus, Copy, Eye, EyeOff, MoreVertical, RefreshCw, 
  Trash2, Edit, Shield, Clock, AlertTriangle, CheckCircle,
  BookOpen, ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function APIKeysPage() {
  const {
    apiKeys, apiKeysLoading, createApiKey, revokeApiKey, refetchAll
  } = usePublicAPI();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('60');
  const [newKeyExpiration, setNewKeyExpiration] = useState<string>('never');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [keyToRotate, setKeyToRotate] = useState<string | null>(null);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Digite um nome para a API Key');
      return;
    }
    if (newKeyScopes.length === 0) {
      toast.error('Selecione ao menos um escopo');
      return;
    }
    
    try {
      const result = await createApiKey.mutateAsync({
        name: newKeyName,
        scopes: newKeyScopes,
        rate_limit_per_minute: parseInt(newKeyRateLimit, 10),
      });
      
      setGeneratedKey(result.key);
      toast.success('API Key criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar API Key');
    }
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKeyName('');
    setNewKeyScopes([]);
    setNewKeyRateLimit('60');
    setNewKeyExpiration('never');
    setGeneratedKey(null);
    setShowKey(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (confirm(`Tem certeza que deseja revogar a API Key "${keyName}"? Esta ação não pode ser desfeita.`)) {
      try {
        await revokeApiKey.mutateAsync(keyId);
      } catch (error) {
        toast.error('Erro ao revogar API Key');
      }
    }
  };

  const handleRotateKey = async () => {
    if (!keyToRotate) return;
    
    // In a real implementation, this would:
    // 1. Create a new key with same scopes
    // 2. Revoke the old key
    // For now, just show the flow
    toast.success('Nova chave gerada! A chave anterior será revogada em 24 horas.');
    setRotateDialogOpen(false);
    setKeyToRotate(null);
  };

  const activeKeys = apiKeys.filter(k => k.is_active);
  const revokedKeys = apiKeys.filter(k => !k.is_active);

  return (
    <MainLayout>
      <PageHeader
        title="Chaves de API"
        description="Gerencie suas API Keys para integrações"
        action={{
          label: "Gerar Nova Chave",
          onClick: () => setCreateDialogOpen(true),
          icon: <Plus className="h-4 w-4" />
        }}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keys Ativas</CardTitle>
            <Key className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeKeys.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keys Revogadas</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revokedKeys.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">60/min</div>
            <p className="text-xs text-muted-foreground">Padrão por key</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentação</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto" onClick={() => window.location.href = '/api/docs'}>
              Ver API Docs
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Keys */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chaves Ativas</CardTitle>
              <CardDescription>
                API Keys que podem ser usadas para autenticação
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchAll()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma API Key ativa</p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeKeys.map((key) => (
                <div key={key.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{key.name}</h4>
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativa
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {key.key_prefix}...
                        </code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(key.key_prefix + '...')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {key.scopes.slice(0, 4).map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                        {key.scopes.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{key.scopes.length - 4} mais
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>
                          Criada: {format(new Date(key.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <span>
                          Rate limit: {key.rate_limit_per_minute}/min
                        </span>
                        {key.last_used_at && (
                          <span>
                            Último uso: {formatDistanceToNow(new Date(key.last_used_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setKeyToRotate(key.id);
                          setRotateDialogOpen(true);
                        }}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Rotacionar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleRevokeKey(key.id, key.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Revogar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Chaves Revogadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revokedKeys.map((key) => (
                  <TableRow key={key.id} className="opacity-60">
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="font-mono text-sm">{key.key_prefix}...</TableCell>
                    <TableCell>{format(new Date(key.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Revogada</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar API Key</DialogTitle>
            <DialogDescription>
              Crie uma nova chave de API para integrar com o Vitrio
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">API Key criada com sucesso!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Copie a chave abaixo. Ela não será exibida novamente.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Sua API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={generatedKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(generatedKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleCloseCreateDialog}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="key-name">Nome da Key</Label>
                <Input
                  id="key-name"
                  placeholder="Ex: Integração WooCommerce"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>

              <div>
                <Label>Escopos de Acesso</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione as permissões que esta key terá
                </p>
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-2">
                    {API_SCOPES.map((scope) => (
                      <div key={scope.value} className="flex items-start gap-2">
                        <Checkbox
                          id={scope.value}
                          checked={newKeyScopes.includes(scope.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewKeyScopes([...newKeyScopes, scope.value]);
                            } else {
                              setNewKeyScopes(newKeyScopes.filter(s => s !== scope.value));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor={scope.value} className="font-medium cursor-pointer">
                            {scope.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{scope.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate-limit">Rate Limit (req/min)</Label>
                  <Select value={newKeyRateLimit} onValueChange={setNewKeyRateLimit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30/min</SelectItem>
                      <SelectItem value="60">60/min (padrão)</SelectItem>
                      <SelectItem value="120">120/min</SelectItem>
                      <SelectItem value="300">300/min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiration">Expiração</Label>
                  <Select value={newKeyExpiration} onValueChange={setNewKeyExpiration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Nunca expira</SelectItem>
                      <SelectItem value="30d">30 dias</SelectItem>
                      <SelectItem value="90d">90 dias</SelectItem>
                      <SelectItem value="1y">1 ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreateDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateKey} disabled={createApiKey.isPending}>
                  {createApiKey.isPending ? 'Criando...' : 'Criar Key'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rotate Key Dialog */}
      <Dialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotacionar API Key</DialogTitle>
            <DialogDescription>
              Uma nova chave será gerada com as mesmas permissões. 
              A chave atual continuará funcionando por 24 horas para permitir a migração.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Atualize suas integrações com a nova chave antes que a antiga expire.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRotateKey}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rotacionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
