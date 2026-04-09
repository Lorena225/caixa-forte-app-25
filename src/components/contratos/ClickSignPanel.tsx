import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PenLine, UserPlus, Send, CheckCircle2, Clock, XCircle,
  RefreshCw, Loader2, FileSignature, Info, Plus, Trash2
} from 'lucide-react';
import { useClickSign, type ClickSignDocument, type ClickSignSigner } from '@/hooks/useClickSign';
import { useUpdateContract } from '@/hooks/useContracts';
import type { Contract } from '@/hooks/useContracts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  contract: Contract;
}

const statusInfo: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  running: { label: 'Em Assinatura', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  closed: { label: 'Assinado', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  canceled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  approved: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

const authLabels: Record<string, string> = {
  email: 'E-mail',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

export function ClickSignPanel({ contract }: Props) {
  const { loading, createDocument, addSigner, closeDocument, getDocument, cancelDocument } = useClickSign();
  const updateContract = useUpdateContract();

  // ClickSign document key é armazenado em condicoes_comerciais_json.clicksign_key
  const storedKey = (contract.condicoes_comerciais_json as Record<string, unknown>)?.clicksign_key as string | undefined;

  const [documentKey, setDocumentKey] = useState<string>(storedKey || '');
  const [docInfo, setDocInfo] = useState<ClickSignDocument | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [pdfBase64, setPdfBase64] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pendingSigners, setPendingSigners] = useState<{
    name: string; email: string; cpf: string; phone: string; signAs: string; auth: string;
  }[]>([{
    name: contract.counterparty?.name || '',
    email: contract.counterparty?.email || '',
    cpf: '',
    phone: contract.counterparty?.phone || '',
    signAs: 'sign',
    auth: 'email',
  }]);

  const [newSigner, setNewSigner] = useState({ name: '', email: '', cpf: '', phone: '', signAs: 'sign', auth: 'email' });

  // Carrega status do documento ao montar se já tem chave
  useEffect(() => {
    if (documentKey) refreshStatus();
  }, []);

  const refreshStatus = async () => {
    if (!documentKey) return;
    setDocLoading(true);
    const doc = await getDocument(documentKey);
    setDocInfo(doc);
    setDocLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // Remove o prefixo data:application/pdf;base64,
      const base64 = result.split(',')[1];
      setPdfBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!pdfBase64) return;

    // 1. Criar documento
    const key = await createDocument({
      contractNumber: contract.contract_number,
      pdfBase64,
      deadlineAt: deadline || undefined,
    });
    if (!key) return;

    // 2. Adicionar signatários
    for (const s of pendingSigners) {
      if (!s.name || !s.email) continue;
      await addSigner({
        documentKey: key,
        name: s.name,
        email: s.email,
        cpf: s.cpf || undefined,
        phone: s.phone || undefined,
        signAs: s.signAs,
        authMethod: s.auth as 'email' | 'sms' | 'whatsapp',
      });
    }

    // 3. Fechar documento
    await closeDocument(key);

    // 4. Salvar a chave no contrato
    const currentJson = (contract.condicoes_comerciais_json as Record<string, unknown>) || {};
    await updateContract.mutateAsync({
      id: contract.id,
      condicoes_comerciais_json: { ...currentJson, clicksign_key: key },
    });

    setDocumentKey(key);
    setShowSendDialog(false);
    await refreshStatus();
  };

  const handleCancel = async () => {
    if (!documentKey) return;
    await cancelDocument(documentKey);
    await refreshStatus();
  };

  if (!documentKey) {
    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Nenhum documento enviado para assinatura neste contrato. Envie o PDF do contrato para coletar assinaturas digitalmente via ClickSign.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="h-4 w-4" /> Assinatura Eletrônica (ClickSign)
            </CardTitle>
            <CardDescription>Envie o contrato para assinatura digital com validade jurídica</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowSendDialog(true)} className="gap-2">
              <Send className="h-4 w-4" /> Enviar para Assinatura
            </Button>
          </CardContent>
        </Card>

        <SendDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          pdfBase64={pdfBase64}
          deadline={deadline}
          pendingSigners={pendingSigners}
          loading={loading}
          onFileChange={handleFileChange}
          onDeadlineChange={setDeadline}
          onSignersChange={setPendingSigners}
          onSend={handleSend}
          contractName={contract.contract_number}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status card */}
      <Card className={cn(
        'border-2',
        docInfo?.status === 'closed' && 'border-green-200',
        docInfo?.status === 'running' && 'border-blue-200',
        docInfo?.status === 'canceled' && 'border-red-200',
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <FileSignature className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Documento ClickSign</CardTitle>
              <CardDescription className="text-xs font-mono">{documentKey}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {docInfo?.status && (() => {
              const info = statusInfo[docInfo.status];
              const Icon = info.icon;
              return (
                <Badge className={cn('gap-1', info.color)}>
                  <Icon className="h-3 w-3" /> {info.label}
                </Badge>
              );
            })()}
            <Button variant="ghost" size="icon" onClick={refreshStatus} disabled={docLoading}>
              <RefreshCw className={cn('h-4 w-4', docLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        {docInfo?.deadline_at && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Prazo: {format(parseISO(docInfo.deadline_at), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Signatários */}
      {docLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Atualizando status...
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Signatários</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!docInfo?.signers?.length ? (
              <div className="text-center py-6 text-muted-foreground text-sm px-4">
                <p>Nenhum signatário encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assinado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docInfo.signers.map((s: ClickSignSigner) => (
                    <TableRow key={s.key}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.email}</TableCell>
                      <TableCell className="capitalize">{s.sign_as}</TableCell>
                      <TableCell>
                        {s.signed_at
                          ? <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Assinado
                            </Badge>
                          : <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                              <Clock className="h-3 w-3 mr-1" /> Pendente
                            </Badge>
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.signed_at
                          ? format(parseISO(s.signed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      {docInfo?.status === 'running' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSigner(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" /> Adicionar Signatário
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            <XCircle className="h-4 w-4" /> Cancelar Documento
          </Button>
        </div>
      )}

      {/* Dialog: adicionar signatário avulso */}
      <Dialog open={showAddSigner} onOpenChange={setShowAddSigner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Signatário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={newSigner.name} onChange={e => setNewSigner(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input type="email" value={newSigner.email} onChange={e => setNewSigner(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input value={newSigner.cpf} onChange={e => setNewSigner(p => ({ ...p, cpf: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={newSigner.phone} onChange={e => setNewSigner(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Papel</Label>
                <Select value={newSigner.signAs} onValueChange={v => setNewSigner(p => ({ ...p, signAs: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sign">Assinar</SelectItem>
                    <SelectItem value="approve">Aprovar</SelectItem>
                    <SelectItem value="witness">Testemunha</SelectItem>
                    <SelectItem value="contractor">Contratante</SelectItem>
                    <SelectItem value="contractee">Contratado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Autenticação</Label>
                <Select value={newSigner.auth} onValueChange={v => setNewSigner(p => ({ ...p, auth: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(authLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSigner(false)}>Cancelar</Button>
            <Button
              disabled={loading || !newSigner.name || !newSigner.email}
              onClick={async () => {
                await addSigner({ documentKey, ...newSigner, authMethod: newSigner.auth as 'email' | 'sms' | 'whatsapp' });
                setShowAddSigner(false);
                await refreshStatus();
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Subcomponente: dialog de envio ---
interface SendDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pdfBase64: string;
  deadline: string;
  pendingSigners: { name: string; email: string; cpf: string; phone: string; signAs: string; auth: string }[];
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeadlineChange: (v: string) => void;
  onSignersChange: (signers: { name: string; email: string; cpf: string; phone: string; signAs: string; auth: string }[]) => void;
  onSend: () => void;
  contractName: string;
}

function SendDialog({
  open, onOpenChange, pdfBase64, deadline, pendingSigners, loading,
  onFileChange, onDeadlineChange, onSignersChange, onSend, contractName
}: SendDialogProps) {
  const addNewSigner = () => {
    onSignersChange([...pendingSigners, { name: '', email: '', cpf: '', phone: '', signAs: 'sign', auth: 'email' }]);
  };

  const updateSigner = (i: number, field: string, value: string) => {
    const updated = pendingSigners.map((s, idx) => idx === i ? { ...s, [field]: value } : s);
    onSignersChange(updated);
  };

  const removeSigner = (i: number) => {
    onSignersChange(pendingSigners.filter((_, idx) => idx !== i));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4" /> Enviar {contractName} para Assinatura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Upload PDF */}
          <div className="space-y-2">
            <Label>Arquivo PDF do Contrato *</Label>
            <Input type="file" accept="application/pdf" onChange={onFileChange} />
            {pdfBase64 && <p className="text-xs text-green-600">PDF carregado com sucesso</p>}
          </div>

          {/* Prazo */}
          <div className="space-y-2">
            <Label>Prazo para Assinatura (opcional)</Label>
            <Input type="date" value={deadline} onChange={e => onDeadlineChange(e.target.value)} />
          </div>

          {/* Signatários */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Signatários</Label>
              <Button variant="outline" size="sm" onClick={addNewSigner} className="gap-1">
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>

            {pendingSigners.map((s, i) => (
              <Card key={i} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Signatário {i + 1}</span>
                  {pendingSigners.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSigner(i)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nome *" value={s.name} onChange={e => updateSigner(i, 'name', e.target.value)} />
                  <Input placeholder="E-mail *" type="email" value={s.email} onChange={e => updateSigner(i, 'email', e.target.value)} />
                  <Input placeholder="CPF" value={s.cpf} onChange={e => updateSigner(i, 'cpf', e.target.value)} />
                  <Input placeholder="Telefone" value={s.phone} onChange={e => updateSigner(i, 'phone', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={s.signAs} onValueChange={v => updateSigner(i, 'signAs', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sign">Assinar</SelectItem>
                      <SelectItem value="approve">Aprovar</SelectItem>
                      <SelectItem value="witness">Testemunha</SelectItem>
                      <SelectItem value="contractor">Contratante</SelectItem>
                      <SelectItem value="contractee">Contratado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={s.auth} onValueChange={v => updateSigner(i, 'auth', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(authLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={onSend}
            disabled={loading || !pdfBase64 || pendingSigners.some(s => !s.name || !s.email)}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar para Assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
