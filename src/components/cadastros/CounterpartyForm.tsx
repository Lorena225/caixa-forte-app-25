import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Building2,
  User,
  MapPin,
  Phone,
  CreditCard,
  FileText,
  Wallet,
} from 'lucide-react';
import { CPFInput, isValidCPF } from '@/components/common/CPFInput';
import { CNPJInput, isValidCNPJ } from '@/components/common/CNPJInput';
import { toast } from 'sonner';

export interface CounterpartyFormData {
  // Básico
  name: string;
  is_client: boolean;
  is_supplier: boolean;
  person_type: 'pf' | 'pj';
  document: string;
  legal_name: string;
  trade_name: string;
  phone: string;
  email: string;
  is_active: boolean;

  // Fiscal PJ
  ie: string;
  ie_is_exempt: boolean;
  im: string;

  // Endereço principal
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip: string;

  // Endereço de entrega
  delivery_same_as_billing: boolean;
  delivery_address_street: string;
  delivery_address_number: string;
  delivery_address_complement: string;
  delivery_address_neighborhood: string;
  delivery_address_city: string;
  delivery_address_state: string;
  delivery_address_zip: string;

  // Contatos
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  finance_contact_name: string;
  finance_contact_phone: string;
  finance_contact_email: string;
  nf_email: string;

  // Dados bancários (fornecedor)
  bank_code: string;
  bank_name: string;
  bank_agency: string;
  bank_agency_digit: string;
  bank_account: string;
  bank_account_digit: string;
  bank_account_type: string;
  pix_key: string;
  pix_key_type: string;

  // Condições comerciais
  payment_terms_payable: number | null;
  payment_terms_receivable: number | null;
  credit_limit: number | null;

  // Observações
  supplier_notes: string;
  client_notes: string;

  // Prontidão (read-only, calculado pelo trigger)
  fiscal_ready?: boolean;
  payment_ready?: boolean;
  collection_ready?: boolean;
  missing_fields_json?: {
    fiscal: string[];
    payment: string[];
    collection: string[];
  };
}

const emptyFormData: CounterpartyFormData = {
  name: '',
  is_client: true,
  is_supplier: false,
  person_type: 'pj',
  document: '',
  legal_name: '',
  trade_name: '',
  phone: '',
  email: '',
  is_active: true,
  ie: '',
  ie_is_exempt: false,
  im: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  delivery_same_as_billing: true,
  delivery_address_street: '',
  delivery_address_number: '',
  delivery_address_complement: '',
  delivery_address_neighborhood: '',
  delivery_address_city: '',
  delivery_address_state: '',
  delivery_address_zip: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  finance_contact_name: '',
  finance_contact_phone: '',
  finance_contact_email: '',
  nf_email: '',
  bank_code: '',
  bank_name: '',
  bank_agency: '',
  bank_agency_digit: '',
  bank_account: '',
  bank_account_digit: '',
  bank_account_type: '',
  pix_key: '',
  pix_key_type: '',
  payment_terms_payable: null,
  payment_terms_receivable: null,
  credit_limit: null,
  supplier_notes: '',
  client_notes: '',
};

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

interface CounterpartyFormProps {
  initialData?: Partial<CounterpartyFormData>;
  onSubmit: (data: CounterpartyFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export function CounterpartyForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditing = false,
}: CounterpartyFormProps) {
  const [formData, setFormData] = useState<CounterpartyFormData>({
    ...emptyFormData,
    ...initialData,
  });

  const [openSections, setOpenSections] = useState({
    address: false,
    delivery: false,
    contacts: false,
    fiscal: false,
    banking: false,
    commercial: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...emptyFormData, ...initialData });
    }
  }, [initialData]);

  const updateField = <K extends keyof CounterpartyFormData>(
    field: K,
    value: CounterpartyFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de nome
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    // Validação de papel
    if (!formData.is_client && !formData.is_supplier) {
      toast.error('Selecione pelo menos Cliente ou Fornecedor');
      return;
    }
    
    // Validação de telefone
    if (!formData.phone.trim()) {
      toast.error('Telefone é obrigatório');
      return;
    }

    // Validação de documento
    const docSanitized = formData.document.replace(/\D/g, '');
    if (formData.person_type === 'pf') {
      if (!docSanitized || !isValidCPF(docSanitized)) {
        toast.error('CPF inválido ou não preenchido');
        return;
      }
    } else {
      if (!docSanitized || !isValidCNPJ(docSanitized)) {
        toast.error('CNPJ inválido ou não preenchido');
        return;
      }
      if (!formData.legal_name.trim()) {
        toast.error('Razão Social é obrigatória para PJ');
        return;
      }
    }

    onSubmit(formData);
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Calcula prontidão local (preview)
  const localFiscalMissing: string[] = [];
  const localPaymentMissing: string[] = [];
  const localCollectionMissing: string[] = [];

  if (formData.person_type === 'pf') {
    if (!formData.document) localFiscalMissing.push('CPF');
    if (!formData.name) localFiscalMissing.push('Nome');
  } else {
    if (!formData.document) localFiscalMissing.push('CNPJ');
    if (!formData.legal_name) localFiscalMissing.push('Razão Social');
    if (!formData.ie_is_exempt && !formData.ie) localFiscalMissing.push('IE');
  }
  if (!formData.address_street) localFiscalMissing.push('Endereço');
  if (!formData.address_number) localFiscalMissing.push('Número');
  if (!formData.address_city) localFiscalMissing.push('Cidade');
  if (!formData.address_state) localFiscalMissing.push('UF');
  if (!formData.address_zip) localFiscalMissing.push('CEP');

  if (formData.is_supplier) {
    const hasBankData = formData.bank_code && formData.bank_agency && formData.bank_account;
    const hasPix = formData.pix_key;
    if (!hasBankData && !hasPix) {
      localPaymentMissing.push('Dados bancários ou PIX');
    }
  }

  if (formData.is_client) {
    const hasContact = formData.phone || formData.email || formData.contact_phone || formData.contact_email;
    if (!hasContact) {
      localCollectionMissing.push('Contato para cobrança');
    }
  }

  const fiscalReady = localFiscalMissing.length === 0;
  const paymentReady = localPaymentMissing.length === 0;
  const collectionReady = localCollectionMissing.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Badges de Prontidão */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
        <Badge variant={fiscalReady ? 'default' : 'secondary'} className="gap-1">
          {fiscalReady ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          Fiscal {fiscalReady ? 'OK' : 'Pendente'}
        </Badge>
        {formData.is_supplier && (
          <Badge variant={paymentReady ? 'default' : 'secondary'} className="gap-1">
            {paymentReady ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            Pagamento {paymentReady ? 'OK' : 'Pendente'}
          </Badge>
        )}
        {formData.is_client && (
          <Badge variant={collectionReady ? 'default' : 'secondary'} className="gap-1">
            {collectionReady ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            Cobrança {collectionReady ? 'OK' : 'Pendente'}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="address">Endereço</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        {/* === TAB BÁSICO === */}
        <TabsContent value="basic" className="space-y-4 pt-4">
          {/* Papel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Papel do Parceiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_client"
                    checked={formData.is_client}
                    onCheckedChange={(checked) => updateField('is_client', !!checked)}
                  />
                  <Label htmlFor="is_client">Cliente</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_supplier"
                    checked={formData.is_supplier}
                    onCheckedChange={(checked) => updateField('is_supplier', !!checked)}
                  />
                  <Label htmlFor="is_supplier">Fornecedor</Label>
                </div>
              </div>
              {!formData.is_client && !formData.is_supplier && (
                <p className="text-sm text-destructive">Selecione pelo menos um papel.</p>
              )}
            </CardContent>
          </Card>

          {/* Tipo de Pessoa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Identificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="pf"
                    name="person_type"
                    value="pf"
                    checked={formData.person_type === 'pf'}
                    onChange={() => updateField('person_type', 'pf')}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="pf">Pessoa Física</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="pj"
                    name="person_type"
                    value="pj"
                    checked={formData.person_type === 'pj'}
                    onChange={() => updateField('person_type', 'pj')}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="pj">Pessoa Jurídica</Label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {formData.person_type === 'pf' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        required
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF *</Label>
                      <CPFInput
                        value={formData.document}
                        onChange={(sanitized) => updateField('document', sanitized)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Razão Social *</Label>
                      <Input
                        value={formData.legal_name}
                        onChange={(e) => {
                          updateField('legal_name', e.target.value);
                          if (!formData.name) updateField('name', e.target.value);
                        }}
                        required
                        placeholder="Razão social"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={formData.trade_name}
                        onChange={(e) => updateField('trade_name', e.target.value)}
                        placeholder="Nome fantasia"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ *</Label>
                      <CNPJInput
                        value={formData.document}
                        onChange={(sanitized) => updateField('document', sanitized)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome (exibição)</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Nome para exibição"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    required
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => updateField('is_active', v)}
                />
                <Label>Ativo</Label>
              </div>
            </CardContent>
          </Card>

          {/* Dados Fiscais PJ */}
          {formData.person_type === 'pj' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dados Fiscais
                </CardTitle>
                <CardDescription>
                  Necessários para emissão de documentos fiscais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Inscrição Estadual</Label>
                    <Input
                      value={formData.ie}
                      onChange={(e) => updateField('ie', e.target.value)}
                      placeholder="Inscrição estadual"
                      disabled={formData.ie_is_exempt}
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="ie_exempt"
                        checked={formData.ie_is_exempt}
                        onCheckedChange={(checked) => updateField('ie_is_exempt', !!checked)}
                      />
                      <Label htmlFor="ie_exempt" className="text-sm">Isento de IE</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Inscrição Municipal</Label>
                    <Input
                      value={formData.im}
                      onChange={(e) => updateField('im', e.target.value)}
                      placeholder="Inscrição municipal"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === TAB ENDEREÇO === */}
        <TabsContent value="address" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço Principal (Cobrança/Fiscal)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                    value={formData.address_street}
                    onChange={(e) => updateField('address_street', e.target.value)}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={formData.address_number}
                    onChange={(e) => updateField('address_number', e.target.value)}
                    placeholder="Nº"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={formData.address_complement}
                    onChange={(e) => updateField('address_complement', e.target.value)}
                    placeholder="Sala, Andar, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={formData.address_neighborhood}
                    onChange={(e) => updateField('address_neighborhood', e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.address_city}
                    onChange={(e) => updateField('address_city', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Select
                    value={formData.address_state}
                    onValueChange={(v) => updateField('address_state', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={formData.address_zip}
                    onChange={(e) => updateField('address_zip', e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço de Entrega */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="same_address"
                  checked={formData.delivery_same_as_billing}
                  onCheckedChange={(checked) => updateField('delivery_same_as_billing', !!checked)}
                />
                <Label htmlFor="same_address">Mesmo endereço de cobrança</Label>
              </div>

              {!formData.delivery_same_as_billing && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Logradouro</Label>
                      <Input
                        value={formData.delivery_address_street}
                        onChange={(e) => updateField('delivery_address_street', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input
                        value={formData.delivery_address_number}
                        onChange={(e) => updateField('delivery_address_number', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input
                        value={formData.delivery_address_complement}
                        onChange={(e) => updateField('delivery_address_complement', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input
                        value={formData.delivery_address_neighborhood}
                        onChange={(e) => updateField('delivery_address_neighborhood', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={formData.delivery_address_city}
                        onChange={(e) => updateField('delivery_address_city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Select
                        value={formData.delivery_address_state}
                        onValueChange={(v) => updateField('delivery_address_state', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BR.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input
                        value={formData.delivery_address_zip}
                        onChange={(e) => updateField('delivery_address_zip', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB CONTATOS === */}
        <TabsContent value="contacts" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contato Principal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => updateField('contact_name', e.target.value)}
                    placeholder="Nome do contato"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => updateField('contact_phone', e.target.value)}
                    placeholder="Telefone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => updateField('contact_email', e.target.value)}
                    placeholder="E-mail"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Contato Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.finance_contact_name}
                    onChange={(e) => updateField('finance_contact_name', e.target.value)}
                    placeholder="Nome do contato financeiro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.finance_contact_phone}
                    onChange={(e) => updateField('finance_contact_phone', e.target.value)}
                    placeholder="Telefone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.finance_contact_email}
                    onChange={(e) => updateField('finance_contact_email', e.target.value)}
                    placeholder="E-mail financeiro"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">E-mail para Nota Fiscal</CardTitle>
              <CardDescription>E-mail para envio automático de XML/DANFE</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="email"
                value={formData.nf_email}
                onChange={(e) => updateField('nf_email', e.target.value)}
                placeholder="nf@empresa.com.br"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB FINANCEIRO === */}
        <TabsContent value="financial" className="space-y-4 pt-4">
          {/* Dados Bancários - só para fornecedor */}
          {formData.is_supplier && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Dados Bancários (Fornecedor)
                </CardTitle>
                <CardDescription>
                  Necessários para pagamentos via transferência/TED
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Código do Banco</Label>
                    <Input
                      value={formData.bank_code}
                      onChange={(e) => updateField('bank_code', e.target.value)}
                      placeholder="Ex: 001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Banco</Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) => updateField('bank_name', e.target.value)}
                      placeholder="Ex: Banco do Brasil"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input
                      value={formData.bank_agency}
                      onChange={(e) => updateField('bank_agency', e.target.value)}
                      placeholder="0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dígito</Label>
                    <Input
                      value={formData.bank_agency_digit}
                      onChange={(e) => updateField('bank_agency_digit', e.target.value)}
                      placeholder="0"
                      className="w-16"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input
                      value={formData.bank_account}
                      onChange={(e) => updateField('bank_account', e.target.value)}
                      placeholder="00000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dígito</Label>
                    <Input
                      value={formData.bank_account_digit}
                      onChange={(e) => updateField('bank_account_digit', e.target.value)}
                      placeholder="0"
                      className="w-16"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Conta</Label>
                  <Select
                    value={formData.bank_account_type}
                    onValueChange={(v) => updateField('bank_account_type', v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="pagamento">Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label className="text-base font-medium">Chave PIX</Label>
                  <div className="grid gap-4 md:grid-cols-2 mt-2">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={formData.pix_key_type}
                        onValueChange={(v) => updateField('pix_key_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Chave</Label>
                      <Input
                        value={formData.pix_key}
                        onChange={(e) => updateField('pix_key', e.target.value)}
                        placeholder="Chave PIX"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prazo de Pagamento Padrão (dias)</Label>
                  <Input
                    type="number"
                    value={formData.payment_terms_payable ?? ''}
                    onChange={(e) => updateField('payment_terms_payable', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Ex: 30"
                    className="w-32"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações do Fornecedor</Label>
                  <Textarea
                    value={formData.supplier_notes}
                    onChange={(e) => updateField('supplier_notes', e.target.value)}
                    placeholder="Notas sobre o fornecedor..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados Comerciais - só para cliente */}
          {formData.is_client && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Dados Comerciais (Cliente)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Limite de Crédito</Label>
                    <Input
                      type="number"
                      value={formData.credit_limit ?? ''}
                      onChange={(e) => updateField('credit_limit', e.target.value ? Number(e.target.value) : null)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo de Recebimento Padrão (dias)</Label>
                    <Input
                      type="number"
                      value={formData.payment_terms_receivable ?? ''}
                      onChange={(e) => updateField('payment_terms_receivable', e.target.value ? Number(e.target.value) : null)}
                      placeholder="Ex: 15"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações Comerciais</Label>
                  <Textarea
                    value={formData.client_notes}
                    onChange={(e) => updateField('client_notes', e.target.value)}
                    placeholder="Notas sobre o cliente..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {!formData.is_supplier && !formData.is_client && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Selecione "Cliente" ou "Fornecedor" na aba Básico para ver as opções financeiras.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

export { emptyFormData };
