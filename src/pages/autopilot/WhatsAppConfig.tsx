import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWhatsAppConnections, useCreateWhatsAppConnection, useDeleteWhatsAppConnection } from "@/hooks/useWhatsApp";
import { useWhatsAppContacts, useUpdateContact } from "@/hooks/useWhatsAppInbox";
import { MessageSquare, Plus, Trash2, Phone, Shield, Users, Settings } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function WhatsAppConfig() {
  const { data: connections, isLoading: loadingConnections } = useWhatsAppConnections();
  const { data: contacts, isLoading: loadingContacts } = useWhatsAppContacts();
  const createConnection = useCreateWhatsAppConnection();
  const deleteConnection = useDeleteWhatsAppConnection();
  const updateContact = useUpdateContact();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [apiToken, setApiToken] = useState("");

  const handleCreate = async () => {
    if (!phoneNumber) {
      toast.error("Informe o número do telefone");
      return;
    }

    try {
      await createConnection.mutateAsync({
        phone_number: phoneNumber,
        credentials_encrypted: apiToken,
      });
      toast.success("Conexão criada com sucesso");
      setIsDialogOpen(false);
      setPhoneNumber("");
      setApiToken("");
    } catch (error) {
      toast.error("Erro ao criar conexão");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConnection.mutateAsync(id);
      toast.success("Conexão removida");
    } catch (error) {
      toast.error("Erro ao remover conexão");
    }
  };

  const handleToggleAllowed = async (contactId: string, isAllowed: boolean) => {
    try {
      await updateContact.mutateAsync({ id: contactId, is_allowed: isAllowed });
      toast.success(isAllowed ? "Contato autorizado" : "Contato desautorizado");
    } catch (error) {
      toast.error("Erro ao atualizar contato");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Conectado</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "disconnected":
        return <Badge variant="destructive">Desconectado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="WhatsApp Autopilot"
          description="Configure conexões WhatsApp e gerencie contatos autorizados"
        />

        {/* Connections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conexões WhatsApp
              </CardTitle>
              <CardDescription>
                Números conectados para receber e enviar mensagens
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conexão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Número do Telefone</Label>
                    <Input
                      placeholder="+55 11 99999-9999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Token da API (opcional)</Label>
                    <Input
                      type="password"
                      placeholder="Token do WhatsApp Cloud API"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreate}
                    disabled={createConnection.isPending}
                  >
                    {createConnection.isPending ? "Criando..." : "Criar Conexão"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingConnections ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !connections?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conexão configurada</p>
                <p className="text-sm">Adicione um número WhatsApp para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{conn.phone_number}</p>
                        <p className="text-sm text-muted-foreground">{conn.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(conn.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(conn.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contatos Autorizados
            </CardTitle>
            <CardDescription>
              Gerencie quem pode enviar comandos para o Autopilot
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingContacts ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !contacts?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum contato registrado</p>
                <p className="text-sm">Contatos serão adicionados automaticamente ao enviar mensagens</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-center">Autorizado</TableHead>
                    <TableHead className="text-center">Bloqueado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-mono">{contact.phone_e164}</TableCell>
                      <TableCell>{contact.display_name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{contact.role}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={contact.is_allowed}
                          onCheckedChange={(checked) => handleToggleAllowed(contact.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {contact.is_blocked && (
                          <Badge variant="destructive">Bloqueado</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Como Configurar
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Crie uma conexão WhatsApp informando o número do telefone</li>
              <li>Configure o webhook no seu provedor (WhatsApp Cloud API ou Evolution API)</li>
              <li>Envie uma mensagem de teste para verificar a conexão</li>
              <li>Autorize os contatos que poderão usar o Autopilot</li>
              <li>Configure regras de automação para categorização automática</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
