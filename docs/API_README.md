# Caixa Forte Financeiro - API REST

API REST para integração com o sistema ERP Caixa Forte Financeiro. Esta documentação cobre autenticação, endpoints disponíveis, exemplos de uso e boas práticas.

## Sumário

- [Autenticação](#autenticação)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Faturamento](#faturamento)
  - [CRM](#crm)
  - [Fiscal](#fiscal)
- [Códigos de Status](#códigos-de-status)
- [Códigos de Erro](#códigos-de-erro)
- [Paginação](#paginação)
- [Filtros](#filtros)
- [Exemplos cURL](#exemplos-curl)
- [SDKs](#sdks)
- [Webhooks](#webhooks)
- [Suporte](#suporte)

---

## Autenticação

A API utiliza autenticação via API Key. Todas as requisições devem incluir o header `X-API-Key`.

### Obtendo sua API Key

1. Acesse o **Portal do Desenvolvedor** em `/developers`
2. Clique em **"Nova API Key"**
3. Defina um nome identificador e selecione os escopos necessários
4. Copie a chave gerada (ela só será exibida uma vez)

### Usando a API Key

```bash
curl -X GET "https://hwiyewggonhyppwaikss.supabase.co/functions/v1/api-v1-faturamento" \
  -H "X-API-Key: cfin_seu_api_key_aqui" \
  -H "Content-Type: application/json"
```

### Escopos Disponíveis

| Escopo | Descrição |
|--------|-----------|
| `faturamento:read` | Leitura de faturas |
| `faturamento:write` | Criação e edição de faturas |
| `faturamento:delete` | Exclusão de faturas |
| `faturamento:*` | Acesso completo a faturamento |
| `crm:read` | Leitura de clientes e leads |
| `crm:write` | Criação e edição de clientes/leads |
| `crm:delete` | Exclusão de clientes/leads |
| `crm:*` | Acesso completo ao CRM |
| `fiscal:read` | Leitura de documentos fiscais |
| `fiscal:write` | Emissão de notas fiscais |
| `fiscal:delete` | Cancelamento de documentos |
| `fiscal:*` | Acesso completo ao módulo fiscal |
| `*` | Acesso total (admin) |

---

## Rate Limiting

| Limite | Valor Padrão |
|--------|--------------|
| Por minuto | 60 requisições |
| Por dia | 10.000 requisições |

Quando o limite é excedido, a API retorna status `429 Too Many Requests` com o header `Retry-After` indicando segundos para aguardar.

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## Endpoints

### Base URL

```
https://hwiyewggonhyppwaikss.supabase.co/functions/v1
```

---

## Faturamento

### Listar Faturas

```
GET /api-v1-faturamento
```

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | integer | Página (default: 1) |
| `limit` | integer | Itens por página (max: 100, default: 50) |
| `status` | string | Filtrar por status |
| `start_date` | date | Data inicial (YYYY-MM-DD) |
| `end_date` | date | Data final (YYYY-MM-DD) |
| `counterparty_id` | uuid | Filtrar por contraparte |

**Resposta de Sucesso (200):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "company_id": "...",
      "counterparty_id": "...",
      "status": "pending",
      "amount": 1500.00,
      "issue_date": "2026-01-15",
      "due_date": "2026-02-15",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "total_pages": 3
  }
}
```

### Buscar Fatura por ID

```
GET /api-v1-faturamento/{id}
```

**Resposta de Sucesso (200):**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": "...",
    "counterparty_id": "...",
    "status": "pending",
    "amount": 1500.00,
    "issue_date": "2026-01-15",
    "due_date": "2026-02-15",
    "description": "Serviços de consultoria",
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-15T10:30:00Z"
  }
}
```

### Criar Fatura

```
POST /api-v1-faturamento
```

**Body:**

```json
{
  "counterparty_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 1500.00,
  "issue_date": "2026-01-15",
  "due_date": "2026-02-15",
  "description": "Serviços de consultoria",
  "status": "pending"
}
```

**Resposta de Sucesso (201):**

```json
{
  "data": {
    "id": "new-invoice-uuid",
    "...": "..."
  },
  "message": "Invoice created successfully"
}
```

### Atualizar Fatura

```
PUT /api-v1-faturamento/{id}
```

**Body:**

```json
{
  "status": "paid",
  "payment_date": "2026-01-20"
}
```

### Deletar Fatura

```
DELETE /api-v1-faturamento/{id}
```

**Resposta de Sucesso (200):**

```json
{
  "message": "Invoice deleted successfully"
}
```

---

## CRM

### Clientes

#### Listar Clientes

```
GET /api-v1-crm/clientes
```

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | integer | Página |
| `limit` | integer | Itens por página (max: 100) |
| `status` | string | Filtrar por status (active, inactive) |
| `segment` | string | Filtrar por segmento |
| `start_date` | date | Data de criação inicial |
| `end_date` | date | Data de criação final |
| `search` | string | Busca por nome, email ou documento |
| `sort_by` | string | Campo para ordenação |
| `sort_order` | string | asc ou desc |

**Resposta:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Empresa ABC Ltda",
      "email": "contato@empresaabc.com.br",
      "phone": "+55 11 99999-9999",
      "document": "12.345.678/0001-90",
      "segment": "tecnologia",
      "status": "active",
      "created_at": "2026-01-10T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 89,
    "total_pages": 2
  }
}
```

#### Buscar Cliente

```
GET /api-v1-crm/clientes/{id}
```

#### Criar Cliente

```
POST /api-v1-crm/clientes
```

**Body:**

```json
{
  "name": "Empresa ABC Ltda",
  "email": "contato@empresaabc.com.br",
  "phone": "+55 11 99999-9999",
  "document": "12.345.678/0001-90",
  "segment": "tecnologia",
  "address": {
    "street": "Av. Paulista, 1000",
    "city": "São Paulo",
    "state": "SP",
    "zip": "01310-100"
  }
}
```

#### Atualizar Cliente

```
PUT /api-v1-crm/clientes/{id}
```

#### Deletar Cliente

```
DELETE /api-v1-crm/clientes/{id}
```

### Leads

#### Listar Leads

```
GET /api-v1-crm/leads
```

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | string | new, contacted, qualified, proposal, won, lost |
| `source` | string | website, referral, social, ads, other |
| `start_date` | date | Data de criação inicial |
| `end_date` | date | Data de criação final |
| `sort_by` | string | Campo para ordenação |
| `sort_order` | string | asc ou desc |

#### Criar Lead

```
POST /api-v1-crm/leads
```

**Body:**

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 98888-7777",
  "source": "website",
  "notes": "Interessado em plano enterprise"
}
```

---

## Fiscal

### NFe - Notas Fiscais Eletrônicas

#### Listar NFe

```
GET /api-v1-fiscal/nfe
```

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | string | draft, authorized, cancelled, denied |
| `tipo` | string | nfe, nfce |
| `start_date` | date | Data de emissão inicial |
| `end_date` | date | Data de emissão final |
| `sort_by` | string | Campo para ordenação (default: issue_date) |
| `sort_order` | string | asc ou desc |

#### Buscar NFe

```
GET /api-v1-fiscal/nfe/{id}
```

#### Emitir NFe

```
POST /api-v1-fiscal/nfe
```

**Body:**

```json
{
  "destinatario_id": "uuid-do-cliente",
  "natureza_operacao": "Venda de mercadoria",
  "serie": "1",
  "items": [
    {
      "produto_id": "uuid-produto",
      "descricao": "Produto XYZ",
      "ncm": "84714900",
      "cfop": "5102",
      "quantidade": 2,
      "valor_unitario": 150.00,
      "valor_total": 300.00
    }
  ],
  "valor_total": 300.00
}
```

**Resposta (201):**

```json
{
  "data": {
    "id": "uuid",
    "document_number": "000001",
    "series": "1",
    "status": "draft",
    "access_key": null,
    "issue_date": "2026-01-15T14:30:00Z"
  },
  "message": "NFe created successfully (draft)"
}
```

#### Cancelar NFe

```
PUT /api-v1-fiscal/nfe/{id}/cancelar
```

**Body:**

```json
{
  "motivo": "Erro na emissão - dados incorretos do destinatário"
}
```

**Nota:** Apenas NFe com status `authorized` podem ser canceladas.

### Calcular Impostos

```
GET /api-v1-fiscal/impostos
```

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `valor` | number | Valor base para cálculo |
| `ncm` | string | Código NCM do produto |
| `cfop` | string | Código CFOP da operação |
| `uf_origem` | string | UF de origem (ex: SP) |
| `uf_destino` | string | UF de destino (ex: RJ) |

**Resposta:**

```json
{
  "data": {
    "valor_base": 1000.00,
    "regime_tributario": "lucro_presumido",
    "ncm": "84714900",
    "cfop": "5102",
    "uf_origem": "SP",
    "uf_destino": "RJ",
    "impostos": {
      "icms": 180.00,
      "pis": 6.50,
      "cofins": 30.00,
      "irpj": 48.00,
      "csll": 28.80,
      "total": 293.30
    },
    "regra_aplicada": "uuid-da-regra"
  }
}
```

### Relatórios Fiscais

```
GET /api-v1-fiscal/relatorios
```

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `tipo` | string | resumo, detalhado |
| `start_date` | date | Data inicial |
| `end_date` | date | Data final |
| `periodo` | string | mes, trimestre, ano |

**Resposta:**

```json
{
  "data": {
    "tipo": "resumo",
    "periodo": {
      "start_date": "2026-01-01",
      "end_date": "2026-01-31"
    },
    "resumo": {
      "total_documentos": 150,
      "notas_emitidas": 120,
      "notas_recebidas": 30,
      "valor_emitidas": 450000.00,
      "valor_recebidas": 180000.00,
      "total_impostos": 85500.00
    },
    "por_status": {
      "authorized": 145,
      "cancelled": 5
    },
    "por_tipo": {
      "nfe": 140,
      "nfce": 10
    }
  }
}
```

### Consultar Tributos

```
GET /api-v1-fiscal/tributos
```

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `ncm` | string | Filtrar por NCM (prefixo) |
| `cfop` | string | Filtrar por CFOP |
| `uf` | string | Filtrar por UF (origem ou destino) |

---

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `201` | Recurso criado |
| `400` | Requisição inválida |
| `401` | Não autorizado |
| `403` | Acesso proibido |
| `404` | Recurso não encontrado |
| `405` | Método não permitido |
| `429` | Rate limit excedido |
| `500` | Erro interno do servidor |

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `MISSING_API_KEY` | Header X-API-Key não fornecido |
| `INVALID_API_KEY` | API Key inválida ou expirada |
| `AUTH_ERROR` | Erro na autenticação |
| `RATE_LIMIT_EXCEEDED` | Limite de requisições excedido |
| `FORBIDDEN` | Sem permissão para esta operação |
| `NOT_FOUND` | Recurso não encontrado |
| `MISSING_ID` | ID do recurso não fornecido |
| `INVALID_BODY` | Corpo da requisição inválido |
| `VALIDATION_ERROR` | Erro de validação dos dados |
| `DATABASE_ERROR` | Erro no banco de dados |
| `INVALID_STATUS` | Status não permite esta operação |
| `ALREADY_CANCELLED` | Documento já cancelado |
| `INTERNAL_ERROR` | Erro interno do servidor |

---

## Paginação

Todas as listagens suportam paginação via query params:

```
GET /api-v1-crm/clientes?page=2&limit=25
```

**Resposta:**

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 25,
    "total": 89,
    "total_pages": 4
  }
}
```

---

## Filtros

### Filtros de Data

```
GET /api-v1-faturamento?start_date=2026-01-01&end_date=2026-01-31
```

### Busca Textual

```
GET /api-v1-crm/clientes?search=empresa
```

### Ordenação

```
GET /api-v1-crm/clientes?sort_by=name&sort_order=asc
```

---

## Exemplos cURL

### Autenticação e Listagem

```bash
# Listar faturas
curl -X GET "https://hwiyewggonhyppwaikss.supabase.co/functions/v1/api-v1-faturamento?page=1&limit=10" \
  -H "X-API-Key: cfin_sua_api_key" \
  -H "Content-Type: application/json"

# Criar cliente
curl -X POST "https://hwiyewggonhyppwaikss.supabase.co/functions/v1/api-v1-crm/clientes" \
  -H "X-API-Key: cfin_sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nova Empresa Ltda",
    "email": "contato@novaempresa.com",
    "document": "12.345.678/0001-90"
  }'

# Calcular impostos
curl -X GET "https://hwiyewggonhyppwaikss.supabase.co/functions/v1/api-v1-fiscal/impostos?valor=1000&ncm=84714900&uf_origem=SP&uf_destino=RJ" \
  -H "X-API-Key: cfin_sua_api_key"

# Emitir NFe
curl -X POST "https://hwiyewggonhyppwaikss.supabase.co/functions/v1/api-v1-fiscal/nfe" \
  -H "X-API-Key: cfin_sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "destinatario_id": "uuid-cliente",
    "natureza_operacao": "Venda de mercadoria",
    "items": [
      {
        "descricao": "Produto ABC",
        "ncm": "84714900",
        "cfop": "5102",
        "quantidade": 1,
        "valor_unitario": 500.00,
        "valor_total": 500.00
      }
    ],
    "valor_total": 500.00
  }'

# Cancelar NFe
curl -X PUT "https://hwiyewggonhyppwaikss.supabase.co/functions/v1/api-v1-fiscal/nfe/{id}/cancelar" \
  -H "X-API-Key: cfin_sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{"motivo": "Erro nos dados"}'
```

---

## SDKs

### JavaScript/TypeScript

```typescript
import { CaixaForteAPI } from '@caixaforte/sdk';

const api = new CaixaForteAPI({
  apiKey: 'cfin_sua_api_key',
  baseUrl: 'https://hwiyewggonhyppwaikss.supabase.co/functions/v1'
});

// Listar clientes
const clientes = await api.crm.clientes.list({
  page: 1,
  limit: 50,
  status: 'active'
});

// Criar fatura
const fatura = await api.faturamento.create({
  counterparty_id: 'uuid',
  amount: 1500.00,
  due_date: '2026-02-15'
});

// Calcular impostos
const impostos = await api.fiscal.calcularImpostos({
  valor: 1000,
  ncm: '84714900',
  uf_origem: 'SP',
  uf_destino: 'RJ'
});
```

### Python

```python
from caixaforte import CaixaForteAPI

api = CaixaForteAPI(api_key='cfin_sua_api_key')

# Listar clientes
clientes = api.crm.clientes.list(page=1, limit=50, status='active')

# Criar lead
lead = api.crm.leads.create(
    name='João Silva',
    email='joao@email.com',
    source='website'
)

# Emitir NFe
nfe = api.fiscal.nfe.emitir(
    destinatario_id='uuid',
    items=[{
        'descricao': 'Produto XYZ',
        'quantidade': 1,
        'valor_unitario': 500.00
    }]
)
```

---

## Webhooks

Configure webhooks para receber notificações em tempo real sobre eventos no sistema.

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `invoice.created` | Nova fatura criada |
| `invoice.paid` | Fatura paga |
| `invoice.overdue` | Fatura vencida |
| `customer.created` | Novo cliente criado |
| `lead.created` | Novo lead criado |
| `lead.converted` | Lead convertido em cliente |
| `nfe.authorized` | NFe autorizada pela SEFAZ |
| `nfe.cancelled` | NFe cancelada |
| `payment.received` | Pagamento recebido |

### Payload do Webhook

```json
{
  "event": "invoice.paid",
  "timestamp": "2026-01-15T14:30:00Z",
  "data": {
    "id": "uuid",
    "amount": 1500.00,
    "paid_at": "2026-01-15T14:30:00Z"
  }
}
```

### Segurança

Todos os webhooks incluem um header `X-Webhook-Signature` com HMAC-SHA256 do payload para verificação de autenticidade.

---

## Suporte

### Canais de Atendimento

- **Email:** api-support@caixaforte.com.br
- **Portal:** developers.caixaforte.com.br
- **Status:** status.caixaforte.com.br

### Recursos

- [Changelog da API](https://developers.caixaforte.com.br/changelog)
- [Postman Collection](https://developers.caixaforte.com.br/postman)
- [OpenAPI Spec](https://developers.caixaforte.com.br/openapi.yaml)

### Versionamento

A API segue versionamento semântico. A versão atual é **v1**.

Mudanças breaking serão comunicadas com 90 dias de antecedência.

---

## Limites e Quotas

| Recurso | Limite |
|---------|--------|
| API Keys por empresa | 10 |
| Webhooks por empresa | 20 |
| Requisições/minuto | 60 |
| Requisições/dia | 10.000 |
| Tamanho máximo do body | 1 MB |
| Itens por página (max) | 100 |

---

© 2026 Caixa Forte Financeiro. Todos os direitos reservados.
