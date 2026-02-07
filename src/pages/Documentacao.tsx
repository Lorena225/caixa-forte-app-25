import { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronRight,
  Rocket,
  Package,
  DollarSign,
  Scale,
  Bot,
  Settings,
  ShoppingCart,
  Boxes,
  Truck,
  Users,
  FileText,
  CreditCard,
  Wallet,
  TrendingUp,
  Calculator,
  BookOpen,
  Receipt,
  Shield,
  Brain,
  MessageSquare,
  Activity,
  Target,
  Zap,
  Building2,
  Plug,
  Upload,
  Lightbulb,
  RepeatIcon,
  FolderKanban,
  Timer,
  LayoutGrid,
  Briefcase
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Complete Knowledge Base Content - Manual Operacional
const knowledgeBase = {
  financeiro: {
    title: 'Módulo Financeiro',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    description: 'Controle completo do fluxo de caixa, contas e planejamento financeiro.',
    modules: [
      {
        id: 'cockpit-tesouraria',
        title: 'O Cockpit de Tesouraria (Visão Geral)',
        icon: Wallet,
        content: `## 📊 O que é?

O **Cockpit de Tesouraria** é o novo dashboard de liquidez que centraliza todas as informações financeiras em tempo real. Ao acessar o menu **Tesouraria**, você verá imediatamente:

- **KPIs de Saldo**: Saldo Total, Entradas (30 dias), Saídas (30 dias) e Indicador de Saúde
- **Gráfico de Posição de Caixa**: Linha do tempo com Saldo Real vs. Projetado
- **Ações Rápidas**: Botões para operações frequentes

---

## 📝 Ações Rápidas (Quick Actions)

**⚡ Nova Transferência** - Transfere valores entre suas contas bancárias com execução imediata (atômica) ou rascunho.

**🔍 Iniciar Conciliação** - Leva direto para a tela de conciliação bancária lado-a-lado.

**📄 Emitir Boleto** - Acesso rápido para emissão de boletos bancários.

---

## 📈 Como ler o Gráfico de Posição

- **Área Verde**: Saldo projetado (considerando recebimentos futuros)
- **Linha Azul**: Evolução diária do saldo
- **Hover**: Passe o mouse para ver valores exatos por data

⚠️ Se a linha se aproximar de zero, o sistema destacará em vermelho.

---

## 💡 Dica da IA

Se você perguntar "Onde vejo meu saldo?", o Copilot responderá: **"Acesse o menu Tesouraria; o gráfico de saldo aparece automaticamente no topo da tela."**`
      },
      {
        id: 'contas-pagar-receber',
        title: 'Gestão de Contas a Pagar e Receber',
        icon: CreditCard,
        content: `## 💰 Baixa Parcial de Títulos

O sistema suporta **pagamentos parciais**: ao pagar menos que o total, o título fica com status "Parcial" e o saldo restante é calculado automaticamente.

---

## 🔄 Lançamentos Recorrentes

Configure contas que se repetem (aluguel, assinaturas): Diário, Semanal, Quinzenal, Mensal, Bimestral, Trimestral, Semestral, Anual. O sistema gera lançamentos futuros automaticamente.

---

## ☑️ Edição em Massa

Marque checkboxes na lista para: Baixar Selecionados, Alterar Status, Gerar Lote de Pagamento.`
      },
      {
        id: 'conciliacao-avancada',
        title: 'Conciliação Bancária Avançada',
        icon: Calculator,
        content: `## 👁️ Visão Lado-a-Lado

| Esquerda (Extrato do Banco) | Direita (Seu Sistema) |
|----------------------------|----------------------|
| Transações importadas | Lançamentos do Caixa Forte |
| Data, valor, descrição | Data, valor, favorecido |

---

## 📁 Central CNAB (Unificada)

**Localização:** Tesouraria > Central de Arquivos (CNAB)

- **Aba Convênios**: Configuração dos bancos
- **Aba Remessas**: Geração de arquivos para envio ao banco
- **Aba Retornos**: Importação de arquivos de retorno

⚠️ O CNAB foi consolidado dentro de Tesouraria > Central de Arquivos.`
      },
      {
        id: 'planejamento-estrategico',
        title: 'Planejamento Estratégico',
        icon: Target,
        content: `## 📈 Rolling Forecast

Previsão dinâmica que se atualiza continuamente com horizonte de 12+ meses.
**Localização:** Tesouraria > Posição de Caixa > Aba "Rolling Forecast"

---

## 🎛️ Simulador What-If

Use sliders para ajustar variáveis (receita, custos) e ver o impacto no saldo em tempo real.
**Localização:** Tesouraria > Posição de Caixa > Aba "What-If"

---

## 📊 Orçado vs. Realizado

Compare metas com execução real usando barras de progresso.`
      },
      {
        id: 'conciliacao-bancaria',
        title: 'Conciliação Bancária',
        icon: Calculator,
        content: `## 📊 O que é?

A **Conciliação Bancária** é o processo de comparar e validar as transações registradas no seu sistema financeiro com o extrato real fornecido pelo banco. Esse processo garante que não haja divergências entre o que você registrou e o que efetivamente ocorreu na conta bancária.

É fundamental para:
- Identificar lançamentos não reconhecidos
- Detectar cobranças indevidas ou taxas bancárias
- Garantir a precisão do saldo de caixa
- Prevenir fraudes e erros operacionais

---

## 📝 Como usar? (Passo a Passo)

**1. Acesse o módulo de Conciliação**
   - Navegue para: **Financeiro > Tesouraria > Conciliação Bancária**
   - Selecione a conta bancária que deseja conciliar

**2. Importe o extrato bancário**
   - Clique em "Importar Extrato"
   - Formatos aceitos: OFX, CSV ou CNAB
   - O sistema carregará automaticamente as transações

**3. Faça o match das transações**
   - O Caixa Forte exibe lado a lado: lançamentos internos x extrato bancário
   - Transações com correspondência exata são destacadas em verde
   - Clique em "Vincular" para confirmar o match
   - Para itens sem correspondência, você pode criar o lançamento ou marcar como divergência

**4. Resolva as divergências**
   - Revise itens em vermelho (não conciliados)
   - Opções: Criar lançamento, Estornar, ou Marcar como taxa bancária

**5. Finalize a conciliação**
   - Verifique se o saldo final bate com o extrato
   - Clique em "Concluir Conciliação"
   - O sistema gerará um relatório de auditoria

---

## 💡 Dica da IA

O CFO Virtual pode **automatizar até 85% das conciliações** usando reconhecimento de padrões. Ele aprende com suas decisões anteriores para sugerir matches automaticamente.

Para ativar: Vá em **Configurações > IA > Conciliação Automática** e habilite a opção "Sugestões Inteligentes".

Quando houver duplicidade ou cobrança suspeita, o sistema emitirá um alerta automático para sua análise.`
      },
      {
        id: 'fluxo-caixa',
        title: 'Leitura do Fluxo de Caixa',
        icon: TrendingUp,
        content: `## 📊 O que é?

O **Fluxo de Caixa** é a visualização de todas as entradas e saídas de dinheiro da empresa em um período determinado. No Caixa Forte, você tem acesso a três visões:

- **Fluxo Realizado**: O que já aconteceu (histórico)
- **Fluxo Projetado**: Previsão baseada em contas a receber/pagar
- **Fluxo Consolidado**: Visão unificada de todas as contas e centros de custo

---

## 📝 Como usar? (Passo a Passo)

**1. Acesse o Dashboard de Fluxo de Caixa**
   - Navegue para: **Financeiro > Tesouraria > Fluxo de Caixa**
   - Por padrão, o sistema exibe os próximos 30 dias

**2. Entenda os indicadores principais**
   - **Saldo Atual**: Dinheiro disponível agora
   - **Entradas Previstas**: Soma das contas a receber
   - **Saídas Previstas**: Soma das contas a pagar
   - **Saldo Projetado**: Saldo futuro estimado

**3. Analise o gráfico de tendência**
   - Linha verde: Entradas
   - Linha vermelha: Saídas
   - Área azul: Saldo acumulado
   - Fique atento quando a linha azul se aproximar de zero!

**4. Filtre por período ou categoria**
   - Use os filtros para ver por mês, trimestre ou ano
   - Analise por categoria de despesa para identificar maiores custos
   - Compare períodos para identificar sazonalidades

**5. Exporte relatórios**
   - Clique em "Exportar" para gerar PDF ou Excel
   - Útil para reuniões de diretoria ou análise bancária

---

## 💡 Dica da IA

O CFO Virtual analisa seu fluxo de caixa diariamente e emite **alertas preditivos**:

- ⚠️ "Em 15 dias, seu saldo pode ficar negativo se não houver novas entradas"
- 💰 "Você tem R$ 50.000 parados. Considere aplicar em CDB de liquidez diária"
- 📈 "Suas entradas aumentaram 23% este mês. Ótimo desempenho!"

Ative os alertas em: **Configurações > IA > Alertas de Caixa**`
      },
      {
        id: 'rolling-forecast',
        title: 'Rolling Forecast',
        icon: Target,
        content: `## 📊 O que é?

O **Rolling Forecast** (Previsão Contínua) é uma técnica avançada de planejamento financeiro que substitui o orçamento anual estático por projeções dinâmicas que se atualizam continuamente.

**Diferença do orçamento tradicional:**
| Orçamento Tradicional | Rolling Forecast |
|----------------------|------------------|
| Fixo para o ano | Atualizado mensalmente |
| Planejado em janeiro | Horizonte sempre 12+ meses |
| Rapidamente desatualizado | Adaptável às mudanças |
| Foco no passado | Foco no futuro |

---

## 📝 Como usar? (Passo a Passo)

**1. Configure o horizonte de previsão**
   - Navegue para: **Financeiro > Planejamento > Rolling Forecast**
   - Defina o horizonte: 12, 18 ou 24 meses à frente
   - Escolha a frequência de atualização (mensal ou trimestral)

**2. Defina as premissas base**
   - Taxa de crescimento esperada
   - Inflação projetada
   - Sazonalidade histórica (o sistema sugere automaticamente)
   - Custos fixos e variáveis

**3. Crie cenários múltiplos**
   - **Otimista**: +20% de receita, -10% de custos
   - **Realista**: Baseado no histórico recente
   - **Pessimista**: -15% de receita, +5% de custos

**4. Acompanhe mensalmente**
   - Todo mês, o sistema adiciona um novo mês ao final
   - Compare "Previsto x Realizado" do mês anterior
   - Ajuste as premissas conforme necessário

**5. Use para tomada de decisão**
   - Antes de grandes investimentos, simule o impacto
   - Apresente cenários para sócios e investidores
   - Antecipe necessidades de capital de giro

---

## 💡 Dica da IA

O CFO Virtual pode **gerar automaticamente** seu Rolling Forecast inicial baseado em 12+ meses de histórico. Ele identifica:

- 📅 Padrões de sazonalidade (ex: vendas maiores em dezembro)
- 📈 Tendências de crescimento ou retração
- 💵 Despesas recorrentes e variações típicas

Para gerar: Clique em **"Gerar Forecast com IA"** e revise as sugestões antes de aprovar.`
      },
      {
        id: 'tesouraria',
        title: 'Tesouraria',
        icon: Wallet,
        content: `## 📊 O que é?

A **Tesouraria** é o centro de comando financeiro da sua empresa. Aqui você gerencia:

- Todas as contas bancárias
- Aplicações financeiras
- Transferências entre contas
- Posição de caixa em tempo real

---

## 📝 Como usar? (Passo a Passo)

**1. Visualize a posição consolidada**
   - Navegue para: **Financeiro > Tesouraria > Posição de Caixa**
   - Veja o saldo total somando todas as contas
   - Cards individuais mostram cada conta bancária

**2. Realize transferências**
   - Clique em "Nova Transferência"
   - Selecione conta de origem e destino
   - Informe valor e data
   - Adicione descrição e clique em "Confirmar"

**3. Registre aplicações/resgates**
   - Para aplicar: Clique em "Nova Aplicação"
   - Selecione o tipo (CDB, Poupança, Fundo)
   - Informe valor, taxa e vencimento

**4. Configure alertas de saldo**
   - Defina saldo mínimo para cada conta
   - Receba notificações quando o saldo estiver baixo

---

## 💡 Dica da IA

O CFO Virtual monitora sua tesouraria 24/7 e pode sugerir:

- 💰 "Transfira R$ 30.000 da conta A para B para evitar tarifa de saldo mínimo"
- 📈 "Você tem R$ 100.000 parados. Aplicar em CDB 100% CDI renderia R$ 1.000/mês"
- ⚠️ "Saldo da conta principal cairá abaixo de R$ 10.000 em 5 dias"`
      },
      {
        id: 'contas-receber',
        title: 'Contas a Receber',
        icon: TrendingUp,
        content: `## 📊 O que é?

O módulo de **Contas a Receber** gerencia todos os valores que a empresa tem direito a receber de clientes, incluindo:

- Vendas parceladas
- Boletos emitidos
- Recebimentos Pix
- Cheques pré-datados

---

## 📝 Como usar? (Passo a Passo)

**1. Visualize os títulos pendentes**
   - Navegue para: **Financeiro > Contas a Receber**
   - Use filtros: Vencimento, Cliente, Status

**2. Análise de Aging**
   - Veja títulos organizados por idade:
   - A vencer | 1-30 dias | 31-60 dias | 61-90 dias | +90 dias
   - Identifique inadimplentes recorrentes

**3. Baixa de recebimentos**
   - Ao receber, clique em "Dar Baixa"
   - Informe data, valor e forma de pagamento
   - Baixa automática disponível com integração bancária

**4. Cobrança automatizada**
   - Configure réguas de cobrança
   - Envio automático de lembretes por email/WhatsApp

---

## 💡 Dica da IA

O CFO Virtual analisa o comportamento de pagamento dos clientes e:

- 🔴 Alerta sobre clientes com alto risco de inadimplência
- 📊 Sugere limites de crédito baseados em histórico
- 💡 Recomenda antecipação de recebíveis quando houver boa taxa`
      },
      {
        id: 'contas-pagar',
        title: 'Contas a Pagar',
        icon: CreditCard,
        content: `## 📊 O que é?

O módulo de **Contas a Pagar** organiza todas as obrigações financeiras da empresa:

- Fornecedores
- Impostos
- Folha de pagamento
- Despesas fixas e variáveis

---

## 📝 Como usar? (Passo a Passo)

**1. Cadastre uma nova conta**
   - Navegue para: **Financeiro > Contas a Pagar**
   - Clique em "Nova Conta"
   - Preencha: Fornecedor, Valor, Vencimento, Categoria

**2. Agende pagamentos**
   - Selecione títulos e clique em "Agendar Pagamento"
   - Defina a data de pagamento
   - Gere remessa bancária (CNAB) se necessário

**3. Aprovação de pagamentos**
   - Pagamentos acima de R$ 5.000 requerem aprovação
   - Aprove via sistema ou WhatsApp

**4. Pagamento em lote**
   - Selecione múltiplos títulos
   - Clique em "Pagar em Lote"
   - Gere arquivo de remessa para o banco

---

## 💡 Dica da IA

O CFO Virtual otimiza seu contas a pagar:

- 📅 Sugere melhor data de pagamento para preservar caixa
- 💰 Identifica fornecedores que oferecem desconto por antecipação
- ⚠️ Alerta sobre vencimentos próximos para evitar multas`
      }
    ]
  },
  fiscal: {
    title: 'Módulo Fiscal',
    icon: Scale,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: 'Emissão de notas fiscais, obrigações acessórias e compliance tributário.',
    modules: [
      {
        id: 'emissao-nfe',
        title: 'Emissão de NF-e',
        icon: Receipt,
        content: `## 📊 O que é?

A **NF-e (Nota Fiscal Eletrônica)** é o documento digital que substitui a nota fiscal em papel. No Caixa Forte, você emite NF-e modelo 55 (vendas para empresas) e NFC-e modelo 65 (vendas para consumidor final).

É obrigatória para:
- Vendas de produtos
- Prestação de alguns serviços
- Operações interestaduais

---

## 📝 Como usar? (Passo a Passo)

**1. Acesse o módulo de emissão**
   - Navegue para: **Fiscal > Notas Fiscais > Emitir NF-e**
   - Ou emita diretamente do PDV/Pedido de Venda

**2. Preencha os dados do destinatário**
   - CNPJ/CPF do cliente
   - Razão Social / Nome
   - Endereço completo (CEP, UF, Município)
   - O sistema busca dados automaticamente pelo CNPJ

**3. Adicione os produtos**
   - Busque pelo código ou nome do produto
   - Confira: NCM, CFOP, CST/CSOSN
   - Informe quantidade e valor unitário
   - Impostos são calculados automaticamente

**4. Revise as informações fiscais**
   - Base de cálculo do ICMS
   - Valores de PIS/COFINS
   - Informações complementares

**5. Transmita para a SEFAZ**
   - Clique em "Emitir NF-e"
   - Aguarde a autorização (geralmente 3-5 segundos)
   - Status: Autorizada, Rejeitada ou Denegada

**6. Em caso de rejeição**
   - Leia o motivo da rejeição
   - Corrija o campo indicado
   - Retransmita a nota

---

## 💡 Dica da IA

O CFO Virtual previne erros na emissão:

- ✅ Valida NCM e CFOP antes da transmissão
- ⚠️ Alerta se o CNPJ do cliente está irregular
- 📊 Sugere CFOP correto baseado na operação
- 🔄 Detecta se a operação requer Nota de Devolução ou Complementar`
      },
      {
        id: 'danfe',
        title: 'Geração de DANFE',
        icon: FileText,
        content: `## 📊 O que é?

O **DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)** é a representação visual impressa da NF-e. Ele não substitui a nota fiscal eletrônica, mas serve para:

- Acompanhar a mercadoria em trânsito
- Consultar a chave de acesso da NF-e
- Registro visual para o destinatário

---

## 📝 Como usar? (Passo a Passo)

**1. Localize a nota emitida**
   - Navegue para: **Fiscal > Notas Fiscais > Consultar**
   - Busque por número, data ou cliente
   - Apenas notas com status "Autorizada" geram DANFE

**2. Gere o DANFE**
   - Clique no ícone de impressora ou "Gerar DANFE"
   - Escolha o formato:
     - **DANFE Retrato**: Formato padrão A4
     - **DANFE Paisagem**: Para notas com muitos itens
     - **DANFE Simplificado**: Formato reduzido (meia página)

**3. Imprima ou envie por email**
   - Use papel A4 comum (não precisa ser especial)
   - Envie PDF por email ao cliente
   - O sistema pode enviar automaticamente após emissão

**4. Elementos do DANFE**
   - Código de barras com chave de acesso (44 dígitos)
   - QR Code para consulta no portal da SEFAZ
   - Dados do emitente e destinatário
   - Lista de produtos com impostos

---

## 💡 Dica da IA

O CFO Virtual automatiza a geração de DANFE:

- 📧 Envia automaticamente para o email do cliente
- 📱 Envia link do PDF via WhatsApp
- 🖨️ Configura impressão automática ao emitir NF-e
- 📁 Arquiva todos os DANFEs organizados por mês/ano`
      },
      {
        id: 'alertas-compliance',
        title: 'Alertas de Compliance',
        icon: Shield,
        content: `## 📊 O que é?

Os **Alertas de Compliance** são notificações inteligentes que o Caixa Forte emite para prevenir problemas fiscais e tributários. O sistema monitora:

- Inconsistências entre lançamentos contábeis e fiscais
- Prazos de obrigações acessórias (SPED, ECD, ECF)
- Divergências entre notas de entrada e saída
- Irregularidades nos cadastros de produtos

---

## 📝 Como interpretar os alertas?

**1. Acesse o painel de compliance**
   - Navegue para: **Fiscal > Compliance > Painel de Alertas**
   - Veja o score de saúde fiscal (0 a 100)

**2. Entenda os níveis de severidade**
   - 🔴 **Crítico**: Risco iminente de multa ou bloqueio. Ação imediata.
   - 🟠 **Alto**: Problema que deve ser resolvido em até 7 dias.
   - 🟡 **Médio**: Inconsistência que requer atenção.
   - 🟢 **Baixo**: Sugestão de melhoria.

**3. Tipos comuns de alertas**
   - "NCM 1234.56.78 não é válido para o produto X"
   - "SPED Fiscal vence em 5 dias e ainda não foi gerado"
   - "Divergência de R$ 15.000 entre NF-e de entrada e XML"
   - "Fornecedor Y com CNPJ irregular na Receita Federal"

**4. Resolva os alertas**
   - Clique no alerta para ver detalhes
   - Siga as instruções de correção
   - Marque como "Resolvido" após corrigir
   - Alertas resolvidos saem do painel

**5. Configure notificações**
   - Receba alertas por email ou WhatsApp
   - Defina quem recebe cada tipo de alerta
   - Configure lembretes de prazos

---

## 💡 Dica da IA

O CFO Virtual faz análise preditiva de compliance:

- 🔮 Prevê riscos antes que se tornem alertas
- 📊 Compara seu score com empresas do mesmo setor
- 📋 Gera relatório mensal de saúde fiscal
- ⚡ Sugere correções automáticas para problemas comuns

Configure em: **Configurações > IA > Compliance Preventivo**`
      },
      {
        id: 'contabilidade',
        title: 'Contabilidade',
        icon: BookOpen,
        content: `## 📊 O que é?

O módulo de **Contabilidade** gerencia todos os registros contábeis da empresa seguindo as normas brasileiras (CPC) e o padrão de partidas dobradas.

---

## 📝 Como usar? (Passo a Passo)

**1. Livro Diário**
   - Navegue para: **Fiscal > Contabilidade > Livro Diário**
   - Visualize todos os lançamentos em ordem cronológica
   - Exporte para ECD (SPED Contábil)

**2. Balanço Patrimonial**
   - Veja a posição de Ativos, Passivos e Patrimônio Líquido
   - Compare períodos para análise de evolução

**3. DRE (Demonstração do Resultado)**
   - Receitas - Custos - Despesas = Lucro
   - Análise vertical e horizontal disponíveis

**4. Balancete de Verificação**
   - Confira se débitos = créditos
   - Identifique contas com saldo irregular

---

## 💡 Dica da IA

O CFO Virtual automatiza lançamentos contábeis:

- 📝 Gera partidas dobradas a partir de transações financeiras
- ✅ Valida a integridade contábil em tempo real
- 📊 Detecta contas com movimentação anômala`
      }
    ]
  },
  contratos: {
    title: 'Gestão de Contratos',
    icon: FileText,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    description: 'Contratos recorrentes, assinaturas, faturamento automático e métricas SaaS.',
    modules: [
      {
        id: 'introducao-recorrencia',
        title: 'Economia da Recorrência',
        icon: TrendingUp,
        content: `## 📊 O que é?

O módulo de **Gestão de Contratos e Recorrência** é o motor de receitas previsíveis do Caixa Forte. Ele permite automatizar cobranças de serviços contínuos como:

- **Consultorias mensais** (Contabilidade, Jurídico, Marketing)
- **Mensalidades** (Academias, Escolas, Clubes)
- **Assinaturas SaaS** (Software, Plataformas, Licenças)
- **Aluguéis e Locações** (Imóveis, Equipamentos, Veículos)

---

## 🎯 O Grande Benefício

> **"Crie o contrato uma vez, e o sistema gera o contas a receber automaticamente todo mês."**

Em vez de criar manualmente 12 lançamentos para um contrato anual, você cadastra **um único contrato** e o sistema:

1. Calcula as datas de vencimento automaticamente
2. Gera os títulos no Financeiro todo mês
3. Aplica reajustes por índices (IGPM, IPCA) no aniversário
4. Alerta sobre contratos prestes a vencer

---

## 📈 Previsibilidade Financeira

Com contratos recorrentes bem geridos, você sabe exatamente:

- 💰 **Quanto vai faturar** nos próximos meses (MRR)
- 📅 **Quando vai receber** (datas de vencimento configuradas)
- 📊 **Taxa de retenção** (Churn Rate)

---

## 💡 Dica da IA

Pergunte ao Copilot: *"Quanto tenho garantido para receber mês que vem?"*

O CFO Virtual somará o valor dos seus contratos ativos (MRR) + Contas a Receber já lançadas, dando uma visão consolidada da sua receita previsível.`
      },
      {
        id: 'criando-contrato',
        title: 'Criando seu Primeiro Contrato',
        icon: FileText,
        content: `## 📝 Passo a Passo

**1. Acesse o módulo**
   - Navegue para: **Financeiro > Contratos & Recorrência**
   - Clique em **"Novo Contrato"**

**2. Selecione o Cliente**
   - Busque pelo nome ou CNPJ/CPF
   - O cliente deve estar cadastrado em Cadastros > Clientes
   - Dica: O sistema filtra automaticamente apenas clientes ativos

**3. Defina a Vigência**
   - **Data de Início**: Quando o contrato entra em vigor
   - **Data de Término**: Quando expira (ou deixe em branco para indeterminado)
   - Contratos sem término continuam gerando cobranças até serem cancelados

**4. Configure o Faturamento**
   - **Valor Mensal**: Valor base da cobrança
   - **Ciclo de Cobrança**: Mensal, Bimestral, Trimestral, Semestral ou Anual
   - **Dia do Vencimento**: Dia do mês para geração da fatura (1-28)

**5. Ative a Automação**
   - Marque **"Gerar faturamento automaticamente"**
   - O sistema criará os títulos no Contas a Receber

---

## 🔄 Regras de Reajuste

Configure o reajuste automático anual para proteger o valor do contrato contra a inflação:

| Índice | Descrição | Uso Comum |
|--------|-----------|-----------|
| **IGPM** | Índice Geral de Preços do Mercado | Aluguéis, Contratos Comerciais |
| **IPCA** | Índice de Preços ao Consumidor Amplo | Planos de Saúde, Mensalidades |
| **INPC** | Índice Nacional de Preços ao Consumidor | Contratos Trabalhistas |
| **Manual** | Você define o percentual | Negociações Específicas |

### Como funciona:
1. No aniversário do contrato, o sistema calcula o novo valor
2. Gera um alerta para aprovação (ou aplica automaticamente se configurado)
3. Atualiza o valor base para as próximas cobranças

---

## 💡 Dica da IA

Se você perguntar *"Como cobro mensalidade de um cliente?"*, o Copilot orientará:

> *"Em vez de lançar 12 contas manuais, crie um Contrato Recorrente em Financeiro > Contratos. O sistema gera as cobranças automaticamente todo mês, aplica reajustes e controla o ciclo de vida."*`
      },
      {
        id: 'motor-faturamento',
        title: 'Motor de Faturamento (Automação)',
        icon: Zap,
        content: `## ⚡ Como Funciona o Faturamento Automático

O **Motor de Faturamento** é o coração da automação de receitas recorrentes. Ele verifica diariamente todos os contratos ativos e gera as cobranças no momento certo.

---

## 📋 Processamento de Faturamento

**1. Acesse o botão "Processar Faturamento"**
   - Navegue para: **Financeiro > Contratos & Recorrência**
   - Clique em **"Gerar Faturamento"**

**2. Selecione o período**
   - **Mês de Referência**: Para qual competência gerar
   - O sistema lista todos os contratos que precisam de cobrança

**3. Revise antes de confirmar**
   - Veja a quantidade de contratos a faturar
   - Confira o valor total que será gerado
   - Clique em **"Confirmar"**

**4. O sistema automaticamente:**
   - ✅ Cria um título no **Contas a Receber** para cada contrato
   - ✅ Define a data de vencimento conforme o dia configurado
   - ✅ Vincula o título ao contrato de origem (rastreabilidade)
   - ✅ Atualiza o status do ciclo de cobrança

---

## 🔗 Vínculo com o Financeiro

Cada fatura gerada fica **"amarrada"** ao contrato original:

| Contrato | Fatura Gerada |
|----------|---------------|
| Contrato #123 - Cliente ABC | Título #4567 - R$ 2.500,00 - Venc: 05/03/2024 |
| Contrato #124 - Cliente XYZ | Título #4568 - R$ 1.800,00 - Venc: 10/03/2024 |

Isso permite:
- 📊 **Auditorias**: Saber de qual contrato veio cada título
- 📈 **Relatórios**: Agrupar receitas por contrato
- 🔄 **Rastreabilidade**: Ver histórico de faturas do contrato

---

## 💡 Dica da IA

O CFO Virtual monitora o faturamento e alerta:

- ⚠️ *"3 contratos vencem em 5 dias e ainda não foram faturados"*
- 💰 *"O faturamento deste mês é 15% maior que o mês passado"*
- 📋 *"Há 2 faturas em aberto de contratos recorrentes"*`
      },
      {
        id: 'ciclo-vida',
        title: 'Ciclo de Vida (Renovação/Cancelamento)',
        icon: Activity,
        content: `## 🔄 Gestão do Ciclo de Vida

Todo contrato passa por fases: Ativo → Suspenso → Cancelado/Renovado. O Caixa Forte oferece controle total sobre cada etapa.

---

## ⏸️ Suspender Contrato

**Quando usar:**
- Cliente pediu pausa temporária (férias, viagem)
- Projeto em stand-by
- Aguardando regularização de pagamento

**O que acontece:**
- ❌ Cobranças são **pausadas** (não gera novos títulos)
- ✅ Histórico é **preservado** (não perde dados)
- ✅ Contrato pode ser **reativado** a qualquer momento

**Como fazer:**
1. Acesse o contrato
2. Clique em **"Suspender"**
3. Informe o motivo (opcional)
4. O status muda para "Suspenso"

---

## ❌ Cancelar Contrato

**Quando usar:**
- Cliente encerrou o serviço definitivamente
- Contrato expirou e não será renovado
- Rescisão por inadimplência

**O que acontece:**
- ❌ Cobranças são **encerradas** permanentemente
- 💰 **Multa rescisória** é calculada (se configurada)
- ✅ Títulos em aberto continuam exigíveis
- ✅ Histórico é preservado para auditorias

**Como fazer:**
1. Acesse o contrato
2. Clique em **"Cancelar"**
3. O sistema calcula a multa (ex: 2x o valor mensal)
4. Confirme e informe o motivo
5. O status muda para "Cancelado"

---

## 🔁 Renovar Contrato

**Quando usar:**
- Contrato com data de término definida
- Cliente deseja continuar o serviço
- Renegociação de valores ou condições

**O que acontece:**
- 📅 **Data final é estendida** para novo período
- 💰 Novo valor pode ser aplicado (se renegociado)
- ✅ Cobranças continuam normalmente

**Como fazer:**
1. Acesse o contrato
2. Clique em **"Renovar"**
3. Defina a nova data de término
4. Ajuste o valor se necessário
5. Confirme a renovação

---

## 💡 Dica da IA

O CFO Virtual monitora o ciclo de vida:

- 🔔 *"5 contratos vencem nos próximos 30 dias"*
- 📊 *"Seu Churn Rate este mês foi de 3,2%"*
- 💡 *"Considere contatar o Cliente ABC - contrato vence em 7 dias"*`
      },
      {
        id: 'kpis-saas',
        title: 'Entendendo as Métricas (KPIs)',
        icon: Target,
        content: `## 📊 Métricas de Receita Recorrente

O módulo de Contratos exibe KPIs essenciais para gestão de negócios por assinatura/recorrência.

---

## 💰 MRR (Monthly Recurring Revenue)

**O que é:**
> Receita Recorrente Mensal - quanto sua empresa **garante de faturamento todo mês**, sem precisar fazer novas vendas.

**Como é calculado:**
\`\`\`
MRR = Soma do valor mensal de todos os contratos ATIVOS
\`\`\`

**Exemplo:**
| Contrato | Valor Mensal |
|----------|-------------|
| Cliente A | R$ 2.000 |
| Cliente B | R$ 1.500 |
| Cliente C | R$ 3.500 |
| **MRR Total** | **R$ 7.000** |

**Por que importa:**
- 📈 Mede a saúde do negócio recorrente
- 💰 Base para projeções de caixa
- 📊 Benchmark: Crescimento de MRR mês a mês

---

## 📉 Churn Rate (Taxa de Cancelamento)

**O que é:**
> Taxa de clientes/contratos que **cancelaram** em um período.

**Como é calculado:**
\`\`\`
Churn Rate = (Contratos Cancelados no Período / Contratos Ativos no Início) x 100
\`\`\`

**Exemplo:**
- Início do mês: 100 contratos ativos
- Cancelamentos: 3 contratos
- Churn Rate = 3%

**Por que importa:**
- 📉 Churn alto indica problemas de retenção
- 💡 Meta típica: < 5% ao mês para B2B
- ⚠️ Churn > 10% requer ação urgente

---

## 📈 ARR (Annual Recurring Revenue)

**O que é:**
> Receita Recorrente Anual - projeção de 12 meses do MRR.

**Cálculo simples:**
\`\`\`
ARR = MRR x 12
\`\`\`

---

## 💡 Dica da IA

Pergunte ao Copilot:

- *"Qual meu MRR atual?"*
- *"Como está meu Churn Rate este mês?"*
- *"Quantos contratos estão prestes a vencer?"*

O CFO Virtual consolida esses dados e oferece insights acionáveis.`
      }
    ]
  },
  projetos: {
    title: 'Gestão de Entregas e Serviços',
    icon: FolderKanban,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    description: 'Transforme contratos em projetos, gerencie tarefas, apontamentos de horas e rentabilidade.',
    modules: [
      {
        id: 'contrato-para-projeto',
        title: 'Do Contrato à Entrega (Fluxo Ideal)',
        icon: Briefcase,
        content: `## 🚀 O que é?

O **Fluxo de Entrega** conecta sua área comercial à operação. Quando você fecha um contrato com um cliente, o próximo passo natural é **criar um Projeto de Entrega** para gerenciar as tarefas, horas e entregas.

---

## 📝 Passo a Passo

**1. Vá ao contrato vendido**
   - Navegue para: **Contratos & Projetos > Lista de Contratos**
   - Localize o contrato do cliente

**2. Clique em "Criar Projeto de Entrega"**
   - O botão aparece no menu de ações (⋮) de cada contrato
   - Contratos ativos ou em execução podem gerar projetos

**3. O sistema herda automaticamente:**
   - ✅ **Cliente/Contraparte**: Já vem preenchido
   - ✅ **Escopo do Contrato**: Descrição e valor total
   - ✅ **Prazo Sugerido**: Baseado na data fim do contrato

**4. Configure o projeto:**
   - **Gerente do Projeto (PM)**: Quem será responsável pela entrega
   - **Prazo Final (Deadline)**: Data limite de conclusão
   - **Orçamento de Horas (Budget)**: Quantas horas foram vendidas

**5. Clique em "Criar Projeto"**
   - O projeto é criado com status "Planejamento"
   - Você é redirecionado para a tela de gestão

---

## 🎯 Por que fazer assim?

> **"Um projeto sem contrato é trabalho sem receita. Um contrato sem projeto é promessa sem entrega."**

A integração garante:
- 📊 **Rastreabilidade**: Saber de qual venda veio cada projeto
- 💰 **Rentabilidade**: Comparar quanto vendeu vs. quanto gastou
- 📈 **Métricas**: Dashboard unificado de contratos e projetos

---

## 💡 Dica da IA

Pergunte ao Copilot: *"Quais contratos ainda não têm projeto vinculado?"*

O CFO Virtual identificará contratos ativos sem projeto de entrega, ajudando você a não deixar nenhuma venda sem acompanhamento.`
      },
      {
        id: 'kanban-gantt',
        title: 'Execução Visual (Kanban e Gantt)',
        icon: LayoutGrid,
        content: `## 📊 Quadro de Tarefas (Kanban)

O **Kanban Board** é a visualização padrão para gerenciar tarefas do projeto. Cada coluna representa um estágio:

| Coluna | Significado |
|--------|-------------|
| **A Fazer** | Tarefas planejadas, aguardando início |
| **Em Andamento** | Trabalho em progresso |
| **Em Revisão** | Aguardando aprovação ou QA |
| **Concluído** | Tarefa finalizada |

---

## 📝 Como usar o Kanban

**1. Acesse o projeto**
   - Navegue para: **Contratos & Projetos > Gestão de Projetos**
   - Clique no projeto desejado
   - Vá para a aba "Tarefas"

**2. Crie tarefas**
   - Clique em "+ Nova Tarefa"
   - Defina: Título, Responsável, Prioridade, Estimativa de horas

**3. Arraste os cards**
   - **Drag & Drop**: Mova tarefas entre colunas
   - A mudança é salva automaticamente
   - O progresso do projeto é recalculado

**4. Visualize o progresso**
   - Barra de progresso no topo mostra % concluído
   - Cards coloridos indicam prioridade (vermelho = urgente)

---

## 📅 Cronograma (Gantt Simplificado)

A visão de **Marcos (Milestones)** funciona como um Gantt simplificado:

- 📍 **Marcos**: Pontos de controle no tempo (ex: "Entrega Fase 1")
- 📆 **Linha do Tempo**: Visualize quando cada marco deve ser atingido
- ⚠️ **Gargalos**: Marcos atrasados são destacados em vermelho

### Como criar Marcos

1. Na aba "Marcos" do projeto
2. Clique em "+ Novo Marco"
3. Defina: Nome, Data prevista, Valor (se for faturável)

---

## 🔗 Faturamento por Marco (Milestone Billing)

Quando um marco é marcado como **"Concluído"**:

1. O sistema verifica se há valor associado
2. Exibe um alerta: *"Marco concluído! Gerar fatura?"*
3. Ao confirmar, cria um Contas a Receber vinculado ao contrato

Isso implementa o modelo de **faturamento por entrega**, comum em consultorias e desenvolvimento de software.

---

## 💡 Dica da IA

O CFO Virtual monitora a execução:

- ⚠️ *"Projeto XYZ tem 3 tarefas atrasadas"*
- 📊 *"A equipe está consumindo horas 20% mais rápido que o planejado"*
- 🎯 *"Marco 'Entrega Fase 1' vence em 5 dias"*`
      },
      {
        id: 'timesheet',
        title: 'Timesheet (Apontamento de Horas)',
        icon: Timer,
        content: `## ⏱️ O Coração da Operação

O **Timesheet** (Apontamento de Horas) é onde você registra o tempo gasto em cada tarefa. Sem ele, **não há cálculo de custo real do projeto**.

> ⚠️ **Importante**: O tempo apontado aqui impacta diretamente o custo do projeto. Seja preciso!

---

## 🎮 Widget de Cronômetro (Play/Pause)

O **Timesheet Widget** é um componente flutuante sempre visível no canto inferior direito da tela.

### Como usar o Play/Pause

**1. Clique em "Apontar Horas"**
   - O botão flutuante aparece em todas as páginas do sistema

**2. Escolha "Iniciar Timer"**
   - Selecione o Projeto
   - Opcionalmente, selecione a Tarefa específica
   - Clique em "Iniciar"

**3. O cronômetro começa a rodar**
   - Contador mostra HH:MM:SS em tempo real
   - Badge mostra o projeto ativo
   - Expanda para ver detalhes

**4. Ao terminar, clique em "Parar Timer"**
   - Adicione uma descrição do que foi feito
   - O tempo é registrado automaticamente

---

## 📝 Lançamento Manual (Retroativo)

Esqueceu de dar play? Sem problema! Use o lançamento manual:

**1. Clique em "Apontar Horas" > "Lançar Manual"**

**2. Preencha:**
   - **Projeto**: Onde trabalhou
   - **Tarefa**: Qual atividade (opcional)
   - **Data**: Quando foi
   - **Início/Fim**: Horário trabalhado
   - **Descrição**: O que foi feito

**3. Clique em "Registrar Horas"**

---

## 📊 Por que o Timesheet é Crítico?

| Com Timesheet | Sem Timesheet |
|---------------|---------------|
| Custo real calculado | Apenas estimativas |
| Rentabilidade precisa | Margem desconhecida |
| Horas x Valor Hora | Chute no escuro |
| Dados para precificação futura | Repetir erros de orçamento |

---

## 💡 Dica da IA

Pergunte ao Copilot:

- *"Quem está trabalhando agora?"* → Lista usuários com timer ativo
- *"Quantas horas gastei no Projeto X esta semana?"* → Soma seus apontamentos
- *"O Projeto Y está dentro do budget de horas?"* → Compara orçado vs. realizado`
      },
      {
        id: 'rentabilidade-projeto',
        title: 'Análise de Rentabilidade (Profitability)',
        icon: TrendingUp,
        content: `## 💰 O Dashboard Financeiro do Projeto

A aba **"Financeiro"** de cada projeto mostra a **Margem de Contribuição** — o lucro real daquele serviço.

---

## 📊 A Fórmula Mágica

\`\`\`
Receita (Valor do Contrato)
- Custo de Pessoal (Horas Apontadas × Valor Hora do Colaborador)
= Margem de Contribuição (Lucro Real)
\`\`\`

---

## 📝 Como Funciona na Prática

**1. Receita do Projeto**
   - Vem do contrato vinculado
   - Valor total ou valor mensal × meses de vigência

**2. Custo de Pessoal**
   - Soma de todas as horas no Timesheet
   - Cada hora é multiplicada pelo **Valor Hora do Colaborador**
   - Configurado em: Cadastros > Usuários > Custo Hora

**3. Margem de Contribuição**
   - Receita - Custo = Margem
   - Margem % = (Margem / Receita) × 100

---

## 📈 Exemplo Real

| Item | Valor |
|------|-------|
| **Receita do Contrato** | R$ 50.000 |
| **Horas Apontadas** | 400 horas |
| **Custo Médio/Hora** | R$ 80 |
| **Custo Total** | R$ 32.000 |
| **Margem de Contribuição** | R$ 18.000 (36%) |

---

## ⚙️ Configurando o Valor Hora

O campo **"Valor Hora"** de cada usuário é a base de cálculo para rentabilidade:

1. Vá em **Configurações > Usuários**
2. Edite o usuário
3. Preencha o campo "Custo Hora" (R$/hora)

> 💡 **Dica**: Use o custo total (salário + encargos + benefícios) dividido por horas produtivas mensais.

---

## 💡 Dica da IA

Pergunte ao Copilot:

- *"O Projeto da Empresa X está dando lucro?"*
  - IA responde: *"Sim, margem atual de 30%"* ou *"Alerta: O custo de horas já consumiu 90% do orçamento"*

- *"Qual projeto tem melhor rentabilidade?"*
  - IA compara todos os projetos ativos

- *"Quanto estou gastando por hora em média?"*
  - IA calcula o custo médio ponderado da equipe`
      },
      {
        id: 'acoes-massa-projetos',
        title: 'Ações em Massa (Produtividade)',
        icon: Boxes,
        content: `## ⚡ Edição em Massa de Tarefas

Gerentes de projeto podem selecionar múltiplas tarefas e aplicar ações em lote, economizando tempo em operações repetitivas.

---

## 📝 Como Usar

**1. Acesse o Kanban do projeto**

**2. Selecione as tarefas**
   - Clique na checkbox de cada card
   - Ou use "Selecionar Todas" na coluna

**3. A barra de ações aparece**
   - Mostra quantos itens selecionados
   - Apresenta as ações disponíveis

**4. Escolha a ação:**

| Ação | Descrição |
|------|-----------|
| **Alterar Responsável** | Reatribui tarefas para outro membro |
| **Mudar Prazo** | Define nova data de entrega em lote |
| **Arquivar** | Move para arquivo morto |
| **Alterar Prioridade** | Muda urgência de várias tarefas |

---

## 🎯 Casos de Uso Comuns

- 📦 **Redistribuição de trabalho**: Membro saiu de férias? Reatribua suas tarefas
- 📅 **Replanejamento**: Prazo do projeto mudou? Ajuste todas as datas
- 🗄️ **Limpeza**: Arquive tarefas concluídas do mês passado

---

## 💡 Dica da IA

O Copilot pode ajudar com ações em massa:

- *"Mova todas as tarefas do João para a Maria"*
- *"Quais tarefas estão atrasadas no Projeto X?"*
- *"Arquive tarefas concluídas há mais de 30 dias"*`
      }
    ]
  },
  inteligencia: {
    title: 'Inteligência (IA)',
    icon: Bot,
    color: 'text-violet-500',
    bgColor: 'bg-violet-50',
    description: 'Automação inteligente, análises preditivas e agentes de IA.',
    modules: [
      {
        id: 'cfo-virtual',
        title: 'CFO Virtual',
        icon: Brain,
        content: `## 📊 O que é?

O **CFO Virtual** é o assistente de inteligência artificial do Caixa Forte. Ele atua como um diretor financeiro digital que monitora, analisa e recomenda ações para otimizar a saúde financeira da sua empresa.

**O que ele analisa:**
- Fluxo de caixa e liquidez
- Indicadores de rentabilidade
- Endividamento e alavancagem
- Eficiência operacional
- Anomalias e fraudes
- Tendências e sazonalidades

---

## 📝 Como usar? (Passo a Passo)

**1. Acesse o painel do CFO Virtual**
   - Navegue para: **Inteligência > CFO Virtual**
   - Ou clique no ícone de chat flutuante (canto inferior direito)

**2. Consulte indicadores de saúde**
   - **Score Financeiro**: 0 a 100 (saúde geral)
   - **Liquidez**: Capacidade de pagar dívidas de curto prazo
   - **Rentabilidade**: Lucro em relação ao faturamento
   - **Eficiência**: Custos vs receitas

**3. Leia as recomendações**
   - O CFO Virtual gera insights diários
   - Exemplo: "Seu custo com fornecedor X aumentou 40%. Negocie!"
   - Clique para ver detalhes e ações sugeridas

**4. Faça perguntas em linguagem natural**
   - "Como está meu fluxo de caixa?"
   - "Quais contas vencem esta semana?"
   - "Qual meu maior cliente este mês?"

**5. Configure alertas personalizados**
   - Defina thresholds para cada indicador
   - Receba notificações por email ou WhatsApp

---

## 💡 Dica da IA

O CFO Virtual aprende com o tempo:

- 📈 Quanto mais dados, melhores as previsões
- 🔄 Dê feedback nas sugestões para refinar a IA
- ⚡ Use comandos rápidos: "resumo do dia", "alertas pendentes"
- 🎯 Peça análises específicas: "compare este mês com o mesmo do ano passado"`
      },
      {
        id: 'simulacoes-what-if',
        title: 'Simulações What-If',
        icon: Target,
        content: `## 📊 O que é?

As **Simulações What-If** (E se...?) permitem projetar o impacto de decisões financeiras antes de executá-las. É uma ferramenta de planejamento estratégico que responde perguntas como:

- "E se eu aumentar os preços em 10%?"
- "E se eu contratar mais 5 funcionários?"
- "E se a inflação subir 2 pontos?"
- "E se eu perder meu maior cliente?"

---

## 📝 Como usar? (Passo a Passo)

**1. Acesse o simulador**
   - Navegue para: **Financeiro > Planejamento > Simulações What-If**
   - Escolha o orçamento/forecast base para simular

**2. Defina as variáveis**
   - **Receitas**: Variação percentual ou valor absoluto
   - **Custos Variáveis**: Margem de contribuição
   - **Custos Fixos**: Novos custos ou reduções
   - **Inflação**: Impacto geral nos preços
   - **Headcount**: Contratações ou demissões

**3. Execute a simulação**
   - Clique em "Simular"
   - O sistema calcula o impacto em:
     - Lucro líquido
     - Fluxo de caixa
     - Ponto de equilíbrio
     - EBITDA

**4. Compare cenários**
   - Crie múltiplas simulações
   - Compare lado a lado: Atual vs Simulado vs Alternativo
   - Visualize em gráficos de linha do tempo

**5. Salve e apresente**
   - Salve simulações para referência futura
   - Exporte em PDF para apresentações
   - Compartilhe com sócios para decisão conjunta

---

## 💡 Dica da IA

O CFO Virtual potencializa suas simulações:

- 🎯 Sugere cenários baseados em benchmarks do setor
- 📊 Calcula probabilidade de cada cenário se realizar
- ⚠️ Alerta sobre riscos: "Se receita cair 20%, você terá déficit em 3 meses"
- 💡 Recomenda: "Para atingir a meta, aumente preços em 5% OU reduza custos em 8%"`
      },
      {
        id: 'monitoramento',
        title: 'Monitoramento Inteligente',
        icon: Activity,
        content: `## 📊 O que é?

O **Monitoramento Inteligente** é o sistema de vigilância 24/7 que detecta anomalias, padrões suspeitos e oportunidades nas suas finanças.

---

## 📝 Como usar? (Passo a Passo)

**1. Acesse o dashboard de monitoramento**
   - Navegue para: **Inteligência > Monitoramento**
   - Veja alertas ativos e histórico

**2. Entenda os tipos de detecção**
   - **Anomalias**: Valores fora do padrão histórico
   - **Fraudes**: Comportamentos suspeitos
   - **Oportunidades**: Situações favoráveis identificadas

**3. Configure sensibilidade**
   - Ajuste o nível de alerta (Baixo, Médio, Alto)
   - Defina horários para não perturbar

**4. Aja sobre os alertas**
   - Investigue cada alerta
   - Marque como "Falso Positivo" se não for relevante
   - A IA aprende com seu feedback

---

## 💡 Dica da IA

O sistema usa Z-Score e Machine Learning para detecção:

- 🔍 Detecta duplicidade de pagamentos
- ⚠️ Identifica fornecedores com comportamento anômalo
- 📈 Reconhece tendências de crescimento ou retração`
      },
      {
        id: 'decisoes-ia',
        title: 'Decisões da IA',
        icon: Zap,
        content: `## 📊 O que é?

A tela de **Decisões da IA** centraliza todas as ações que a inteligência artificial propõe ou executa automaticamente.

---

## 📝 Como usar? (Passo a Passo)

**1. Acesse as decisões pendentes**
   - Navegue para: **Inteligência > Decisões da IA**
   - Veja a fila de ações aguardando aprovação

**2. Revise cada decisão**
   - Leia a justificativa da IA
   - Veja o nível de confiança (%)
   - Analise o impacto financeiro

**3. Aprove, rejeite ou edite**
   - ✅ Aprovar: Executa a ação proposta
   - ❌ Rejeitar: Descarta a sugestão
   - ✏️ Editar: Ajuste valores antes de aprovar

**4. Configure o modo autopiloto**
   - Defina quais ações podem ser automáticas
   - Exemplo: "Aprovar pagamentos < R$ 1.000 automaticamente"

---

## 💡 Dica da IA

Quanto mais feedback você dá, melhor a IA fica:

- 👍 Aprovar ensina a IA a repetir o comportamento
- 👎 Rejeitar ensina a IA a evitar sugestões similares
- 📝 Editar refina os parâmetros da IA`
      },
      {
        id: 'agente-whatsapp',
        title: 'Agente WhatsApp',
        icon: MessageSquare,
        content: `## 📊 O que é?

O **Agente WhatsApp** permite interagir com o Caixa Forte via mensagens de texto, facilitando consultas e aprovações de qualquer lugar.

---

## 📝 Como usar? (Passo a Passo)

**1. Conecte seu WhatsApp**
   - Vá em: **Configurações > Integrações > WhatsApp**
   - Escaneie o QR Code
   - Vincule seu número à empresa

**2. Comandos disponíveis**
   - "saldo" - Posição de caixa atual
   - "vencimentos" - Contas a pagar/receber do dia
   - "aprovar [código]" - Aprova um pagamento
   - "resumo" - Resumo financeiro do dia

**3. Receba notificações**
   - Alertas de vencimento
   - Solicitações de aprovação
   - Insights do CFO Virtual

---

## 💡 Dica da IA

O agente entende linguagem natural:

- 📱 "Quanto tenho no banco?" funciona igual a "saldo"
- ✅ Responda "ok" para aprovar um pagamento
- 🔐 PIN de segurança para operações sensíveis`
      }
    ]
  },
  operacional: {
    title: 'Módulo Operacional',
    icon: Rocket,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    description: 'PDV, gestão de produtos, inventário, movimentações de estoque e logística.',
    modules: [
      {
        id: 'pdv',
        title: 'PDV (Ponto de Venda)',
        icon: ShoppingCart,
        content: `## 📊 O que é?

O **PDV (Ponto de Venda)** é o módulo de frente de caixa do Caixa Forte. Ele permite registrar vendas de forma rápida, com interface otimizada para operadores e múltiplas formas de pagamento.

---

## 📝 Como usar? (Passo a Passo)

**1. Abra o PDV**
   - Navegue para: **Operacional > PDV**
   - Faça login como operador de caixa
   - Confirme a abertura do caixa (saldo inicial)

**2. Adicione produtos à venda**
   - Digite o código de barras ou nome do produto
   - Use o leitor de código de barras para agilizar
   - Ajuste quantidade se necessário
   - Para desconto, clique no item e aplique %

**3. Finalize a venda**
   - Clique em "Finalizar" ou pressione F12
   - Selecione a forma de pagamento:
     - 💵 Dinheiro (informe valor recebido para troco)
     - 💳 Cartão (débito/crédito)
     - 📱 Pix (gera QR Code automático)
   - Pagamento misto: Combine formas de pagamento

**4. Emita o cupom**
   - NFC-e emitida automaticamente (se configurado)
   - Imprima cupom ou envie por WhatsApp/email
   - O sistema atualiza o estoque em tempo real

**5. Operações especiais**
   - **Sangria**: Retire dinheiro do caixa (F6)
   - **Suprimento**: Adicione dinheiro ao caixa (F7)
   - **Cancelamento**: Cancele venda (requer supervisor)
   - **Fechamento**: Encerre o caixa e confira valores

---

## 💡 Dica da IA

O CFO Virtual otimiza suas vendas:

- 📊 Sugere produtos relacionados para venda adicional
- ⚠️ Alerta sobre estoque baixo durante a venda
- 💰 Identifica horários de pico para escalas de atendimento
- 🎯 Analisa ticket médio e sugere estratégias de upsell`
      },
      {
        id: 'movimentacoes-estoque',
        title: 'Movimentações de Estoque',
        icon: Truck,
        content: `## 📊 O que é?

As **Movimentações de Estoque** são registros contínuos de toda entrada e saída de produtos do seu estoque. Diferente do Inventário (conferência periódica), as movimentações acontecem em tempo real, conforme as operações do dia a dia.

**Tipos de Movimentação:**
| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| Entrada | Produtos entrando no estoque | Compra de fornecedor |
| Saída | Produtos saindo do estoque | Venda, consumo interno |
| Transferência | Movimentação entre locais | Matriz → Filial |
| Ajuste | Correção manual de quantidade | Perda, quebra, furto |

---

## 📝 Como usar? (Passo a Passo)

**1. Acesse as movimentações**
   - Navegue para: **Operacional > Estoque > Movimentações**
   - Visualize o histórico completo filtrado por data

**2. Registre uma nova movimentação**
   - Clique em "Nova Movimentação"
   - Selecione o tipo: Entrada, Saída, Transferência ou Ajuste
   - Escolha o produto
   - Informe quantidade e custo unitário (se aplicável)
   - Adicione documento de referência (NF, pedido)

**3. Acompanhe o impacto em tempo real**
   - O estoque é atualizado automaticamente
   - Veja o saldo antes e depois da movimentação
   - Alertas disparam se atingir estoque mínimo

**4. Como ajustar estoque manualmente?**
   - Tipo: **Ajuste**
   - Informe a diferença (positiva ou negativa)
   - Motivo obrigatório: perda, quebra, furto, correção
   - O sistema gera lançamento contábil automático

---

## 💡 Dica da IA

O CFO Virtual monitora suas movimentações:

- 📉 Detecta padrões de consumo anormal
- ⚠️ Alerta sobre **Ruptura de Estoque** (quantidade zerou ou ficou negativa)
- 🔄 Sugere reposição automática baseada em lead time
- 📊 Identifica produtos com alta rotatividade`
      },
      {
        id: 'inventario',
        title: 'Inventário (Contagem Periódica)',
        icon: Boxes,
        content: `## 📊 O que é?

O **Inventário** é o processo de **conferência física periódica** do estoque. Diferente das movimentações (contínuas), o inventário é uma fotografia do que realmente existe no seu armazém em um momento específico.

**Diferença entre Movimentação e Inventário:**
| Aspecto | Movimentação | Inventário |
|---------|--------------|------------|
| Frequência | Contínua (tempo real) | Periódica (mensal, trimestral) |
| Objetivo | Registrar entradas/saídas | Conferir quantidade física |
| Resultado | Atualiza estoque | Detecta divergências |
| Ação | Automática | Ajuste manual |

---

## 📝 Como usar? (Passo a Passo)

**1. Inicie um novo inventário**
   - Navegue para: **Operacional > Estoque > Inventário**
   - Clique em "Novo Inventário"
   - Selecione: Todos os produtos ou categorias específicas

**2. Realize a contagem física**
   - Imprima a lista de contagem (ou use dispositivo móvel)
   - Conte fisicamente cada item
   - Registre a quantidade encontrada

**3. Compare com o sistema**
   - O Caixa Forte mostra: **Esperado vs Contado**
   - Divergências são destacadas em vermelho
   - Valor financeiro da diferença é calculado

**4. Finalize o inventário**
   - Revise todas as divergências
   - Clique em "Finalizar Inventário"
   - O sistema gera automaticamente:
     - Ajustes de estoque
     - Lançamentos contábeis
     - Relatório de auditoria

---

## 💡 Dica da IA

O CFO Virtual otimiza seu inventário:

- 📅 Sugere frequência ideal de contagem por categoria (Curva ABC)
- ⚠️ Prioriza itens com alto valor ou alta rotatividade
- 📊 Calcula a **Acuracidade de Estoque** (meta: >98%)
- 💰 Estima impacto financeiro das divergências`
      },
      {
        id: 'estoque-minimo-ruptura',
        title: 'Estoque Mínimo e Ruptura',
        icon: Activity,
        content: `## 📊 O que é?

O **Estoque Mínimo** é a quantidade limite que você deve ter de cada produto para não correr o risco de **Ruptura de Estoque** (ficar sem o produto para vender).

**Conceitos importantes:**
- **Estoque Mínimo**: Quantidade de segurança que dispara alerta de reposição
- **Ruptura de Estoque**: Quando a quantidade disponível é zero ou negativa
- **Ponto de Pedido**: Momento ideal para fazer novo pedido de compra
- **Lead Time**: Tempo entre o pedido e o recebimento do fornecedor

---

## 📝 Como configurar?

**1. Defina o estoque mínimo por produto**
   - Navegue para: **Operacional > Produtos > Catálogo**
   - Edite o produto desejado
   - Na aba "Estoque", configure:
     - **Estoque Mínimo**: Quantidade de segurança
     - **Estoque Máximo**: Limite superior (opcional)

**2. Cálculo recomendado**
   - Estoque Mínimo = Consumo Médio Diário × Lead Time × 1,5 (margem de segurança)
   - Exemplo: Se vende 10 un/dia e fornecedor entrega em 5 dias:
     - Estoque Mínimo = 10 × 5 × 1,5 = **75 unidades**

**3. Monitore os alertas**
   - Dashboard mostra produtos abaixo do mínimo
   - Receba notificações por email ou WhatsApp
   - Gere pedido de compra automaticamente

---

## 💡 Dica da IA

O CFO Virtual calcula automaticamente:

- 📈 Sugere estoque mínimo baseado no histórico de vendas
- 🔮 Prevê ruptura antes que aconteça
- 📊 Identifica sazonalidade (Natal, Black Friday)
- 💰 Calcula custo de manter estoque vs custo de ruptura`
      },
      {
        id: 'centros-custodia',
        title: 'Classificação por Centro de Custo/Departamento',
        icon: Building2,
        content: `## 📊 O que é?

A **Classificação por Centro de Custo e Departamento** organiza seus produtos e transações para análise gerencial detalhada. Isso substitui o conceito antigo de "Dimensões Gerenciais" com uma abordagem mais intuitiva.

**Exemplos de Centro de Custo:**
- Loja Matriz
- Filial Centro
- E-commerce
- Marketplace

**Exemplos de Departamento:**
- Eletrônicos
- Vestuário
- Alimentos
- Serviços

---

## 📝 Como usar? (Passo a Passo)

**1. Cadastre Centros de Custo**
   - Navegue para: **Configurações > Cadastros > Centros de Custo**
   - Crie: Matriz, Filiais, Canais de Venda

**2. Cadastre Departamentos**
   - Navegue para: **Configurações > Cadastros > Departamentos**
   - Organize por categoria de produto ou área

**3. Vincule aos Produtos**
   - Ao cadastrar um produto, selecione o Centro de Custo padrão
   - O departamento pode vir da categoria do produto

**4. Analise por dimensão**
   - Relatórios filtram por Centro de Custo ou Departamento
   - Compare desempenho entre lojas ou categorias
   - Identifique os mais rentáveis

---

## 💡 Dica da IA

O CFO Virtual cruza dados por dimensão:

- 📊 Ranking de vendas por Centro de Custo
- 💰 Margem de lucro por Departamento
- 📉 Detecta unidades com baixo desempenho
- 🎯 Sugere ações de otimização por local`
      },
      {
        id: 'produtos',
        title: 'Catálogo de Produtos',
        icon: Boxes,
        content: `## 📊 O que é?

O **Catálogo de Produtos** centraliza todo o cadastro de itens comercializados pela empresa.

---

## 📝 Como usar? (Passo a Passo)

**1. Cadastre um produto**
   - Navegue para: **Operacional > Produtos > Catálogo**
   - Clique em "Novo Produto"
   - Preencha: Nome, **SKU** (código único interno), Código de barras (EAN)
   - Defina preço de venda e custo

**2. Entenda os campos importantes**
   - **SKU (Referência)**: Código interno único para identificar o produto. Use padrões como "ELET-001" ou "CAM-AZUL-M"
   - **Estoque Mínimo**: Quantidade que dispara alerta de reposição
   - **Centro de Custo**: Local/unidade responsável pelo produto
   - **NCM**: Código fiscal obrigatório para NF-e

**3. Configure tributação**
   - NCM (obrigatório para NF-e)
   - CFOP padrão
   - CST/CSOSN
   - Alíquotas de ICMS, PIS, COFINS

**4. Organize em categorias**
   - Crie hierarquias (Eletrônicos > Celulares > iPhones)
   - Facilita busca e relatórios

---

## 💡 Dica da IA

O CFO Virtual analisa seu catálogo:

- 📊 Identifica produtos mais e menos vendidos
- 💰 Sugere precificação baseada em margem e concorrência
- ⚠️ Alerta sobre produtos sem movimentação
- 🔍 Detecta SKUs duplicados ou inconsistentes`
      }
    ]
  },
  suprimentos: {
    title: 'Suprimentos',
    icon: Package,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    description: 'Gestão inteligente do fluxo de aquisição: Cotações, Pedidos e Entradas.',
    modules: [
      {
        id: 'fluxo-aquisicao',
        title: 'Fluxo de Aquisição Inteligente',
        icon: Zap,
        content: `## 🚀 Visão Geral

O **Fluxo de Aquisição Inteligente** do Caixa Forte organiza todo o processo de compras em três etapas conectadas:

**Cotação → Pedido → Entrada**

Cada etapa alimenta a próxima, garantindo rastreabilidade completa e automação de tarefas repetitivas.

---

## 📊 Diagrama do Fluxo

| Etapa | Objetivo | Resultado |
|-------|----------|-----------|
| 1. Cotação | Comparar preços entre fornecedores | Melhor proposta selecionada |
| 2. Pedido | Formalizar a intenção de compra | Pedido enviado ao fornecedor |
| 3. Entrada | Registrar recebimento físico | Estoque atualizado + Conta a Pagar |

---

## 💡 Dica da IA

O CFO Virtual acompanha todo o fluxo e:

- 📊 Sugere o melhor fornecedor baseado em histórico
- ⚠️ Alerta sobre prazos de entrega em risco
- 💰 Identifica oportunidades de negociação
- 🔄 Automatiza criação de pedido a partir de cotação aprovada`
      },
      {
        id: 'cotacoes',
        title: 'Cotações',
        icon: Calculator,
        content: `## 📊 O que é?

As **Cotações** permitem comparar preços e condições de múltiplos fornecedores antes de realizar uma compra. É a primeira etapa do fluxo de aquisição.

---

## 📝 Como usar? (Passo a Passo)

**1. Crie uma nova cotação**
   - Navegue para: **Suprimentos > Cotações**
   - Clique em "Nova Cotação"
   - Selecione os produtos que deseja cotar

**2. Adicione fornecedores**
   - Inclua 2 ou mais fornecedores para comparação
   - O sistema pode sugerir fornecedores com base no histórico

**3. Envie os pedidos de cotação**
   - Gere PDF ou envie por email automaticamente
   - Defina prazo limite para respostas

**4. Registre as propostas**
   - Ao receber respostas, registre os valores
   - O sistema destaca automaticamente a melhor oferta
   - Compare: preço, prazo de pagamento, prazo de entrega

**5. Aprove e gere o pedido**
   - Selecione a melhor proposta
   - Clique em "Gerar Pedido de Compra"
   - O pedido é criado com os dados da cotação

---

## 💡 Dica da IA

O CFO Virtual potencializa suas cotações:

- 📊 Analisa histórico de preços do produto
- ⚠️ Alerta se o preço está acima da média
- 💰 Sugere negociar desconto por volume
- 🏆 Rankeia fornecedores por melhor custo-benefício`
      },
      {
        id: 'compras',
        title: 'Pedidos de Compra',
        icon: FileText,
        content: `## 📊 O que é?

O **Pedido de Compra** formaliza a intenção de aquisição junto ao fornecedor. É a segunda etapa do fluxo, gerada após aprovação de uma cotação ou criada diretamente.

---

## 📝 Como usar? (Passo a Passo)

**1. Crie ou gere um pedido**
   - Navegue para: **Suprimentos > Pedidos**
   - Clique em "Novo Pedido" ou gere a partir de uma cotação
   - Selecione o fornecedor

**2. Adicione itens ao pedido**
   - Busque produtos pelo nome ou código
   - Informe quantidade, preço negociado e desconto
   - Defina condições de pagamento

**3. Gerencie prazos de entrega**
   - Informe a data prevista de entrega
   - O sistema monitora e alerta sobre atrasos
   - Status do pedido: Rascunho → Enviado → Em Trânsito → Entregue

**4. Edite o pedido quando necessário**
   - Clique em "Ações" para editar itens, valores ou status
   - Ajuste quantidades ou preços conforme negociação
   - Altere o status para acompanhar o progresso

**5. Aguarde a entrega**
   - Quando a mercadoria chegar, registre uma "Entrada"
   - O pedido é vinculado automaticamente à entrada

---

## 💡 Dica da IA

O CFO Virtual otimiza seus pedidos:

- 📊 Compara preços entre pedidos históricos
- 📅 Sugere melhor momento para comprar (sazonalidade)
- ⚠️ Alerta sobre fornecedores com atraso recorrente
- 🔄 Sugere reposição automática baseada em estoque mínimo`
      },
      {
        id: 'entradas',
        title: 'Entradas (O Coração da Logística)',
        icon: Package,
        content: `## 📊 O que é?

A **Entrada** é o registro do recebimento físico de mercadorias no seu estoque. É a etapa final e mais importante do fluxo de aquisição, pois dispara **três ações automáticas** no sistema.

---

## ⚡ As 3 Ações Automáticas da Entrada

Ao confirmar uma "Nova Entrada", o Caixa Forte executa automaticamente:

| # | Ação | Descrição |
|---|------|-----------|
| 1 | **Atualiza o Estoque** | O saldo dos produtos é somado à tabela de inventário |
| 2 | **Registra o Custo Médio** | O custo unitário é atualizado no Catálogo de Produtos |
| 3 | **Cria Conta a Pagar** | Uma obrigação é gerada no módulo Financeiro |

---

## 📝 Como usar? (Passo a Passo)

**1. Registre uma nova entrada**
   - Navegue para: **Suprimentos > Entradas**
   - Clique em "Nova Entrada"
   - Vincule a um Pedido de Compra existente (opcional)

**2. Preencha os dados fiscais**
   - Informe o número da Nota Fiscal do fornecedor
   - Data de emissão e valor total
   - Selecione o fornecedor

**3. Adicione os produtos recebidos**
   - Busque pelo código ou nome do produto
   - Informe a quantidade recebida
   - Confira o custo unitário (será usado no cálculo do custo médio)

**4. Confira e confirme a entrada**
   - Revise todos os itens
   - Clique em "Confirmar Entrada"
   - **IMPORTANTE**: Neste momento as 3 ações automáticas são executadas!

**5. Acompanhe os impactos**
   - Vá em **Estoque > Central de Estoque** para ver o novo saldo
   - Vá em **Financeiro > Contas a Pagar** para ver a obrigação criada
   - O custo médio é atualizado automaticamente no cadastro do produto

---

## 💡 Dica da IA

O CFO Virtual monitora suas entradas:

- ⚠️ Alerta se a quantidade recebida diverge do pedido
- 📊 Detecta variação de preço acima do normal
- 💰 Calcula automaticamente o novo custo médio ponderado
- 📅 Integra o vencimento da conta a pagar no fluxo de caixa`
      },
      {
        id: 'fornecedores',
        title: 'Gestão de Fornecedores',
        icon: Users,
        content: `## 📊 O que é?

A **Gestão de Fornecedores** centraliza informações e avalia o desempenho de cada parceiro comercial. O cadastro de fornecedores está unificado com o de clientes em **Cadastros Base**.

---

## 📝 Como acessar?

**Acesso rápido:**
- Menu lateral: **Suprimentos > Fornecedores**
- Ou navegue para: **Configurações > Cadastros > Clientes/Fornecedores**
- Filtre por "Tipo: Fornecedor" para ver apenas parceiros de compra

---

## 📝 Como usar? (Passo a Passo)

**1. Cadastre um fornecedor**
   - Clique em "Novo Cadastro"
   - Marque o tipo como "Fornecedor"
   - Preencha: CNPJ, Razão Social, Contatos

**2. Configure condições comerciais**
   - Prazo padrão de pagamento
   - Descontos por antecipação
   - Frete e condições de entrega

**3. Avalie o desempenho**
   - O sistema calcula automaticamente:
     - Pontualidade de entrega
     - Qualidade dos produtos
     - Atendimento a reclamações

**4. Consulte histórico**
   - Veja todos os pedidos realizados
   - Analise evolução de preços
   - Identifique oportunidades de negociação

---

## 💡 Dica da IA

O CFO Virtual analisa seus fornecedores:

- ⭐ Ranking de melhores fornecedores por categoria
- 📉 Detecta aumento de preços acima do mercado
- 🔄 Sugere alternativas quando há problemas recorrentes
- 📊 Compara condições de pagamento entre fornecedores`
      }
    ]
  },
  produtividade: {
    title: 'Produtividade',
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    description: 'Dicas e ferramentas para aumentar sua eficiência no sistema.',
    modules: [
      {
        id: 'edicao-massa',
        title: 'Edição em Massa (Bulk Actions)',
        icon: Boxes,
        content: `## 📊 O que é?

A **Edição em Massa** permite selecionar múltiplos registros e aplicar ações simultaneamente, economizando tempo em operações repetitivas.

---

## 📝 Como usar? (Passo a Passo)

**1. Ative a seleção múltipla**
   - Em tabelas como Vendas, Produtos, Pedidos ou Fornecedores
   - Marque as checkboxes na primeira coluna de cada linha
   - Use a checkbox do cabeçalho para selecionar/desmarcar todos

**2. Veja a barra de ações flutuante**
   - Ao selecionar itens, uma barra aparece na parte inferior
   - Ela mostra quantos registros estão selecionados
   - Apresenta as ações disponíveis

**3. Ações disponíveis**
   - **Excluir Selecionados**: Remove múltiplos registros de uma vez
   - **Alterar Status em Massa**: Mude o status de vários itens simultaneamente
   - **Editar Categoria**: Reclassifique produtos ou transações em lote

**4. Confirme a ação**
   - Um modal de confirmação aparecerá
   - Revise os itens selecionados
   - Clique em "Confirmar" para executar

---

## 💡 Dica da IA

Para máxima produtividade:

- 🔍 Use filtros antes de selecionar para agrupar itens similares
- ⚡ Combine com busca para encontrar registros específicos
- 📊 A edição em massa gera logs de auditoria para rastreabilidade
- ⏱️ Economize até 80% do tempo em operações de manutenção de cadastros`
      },
      {
        id: 'atalhos-teclado',
        title: 'Atalhos de Teclado',
        icon: Zap,
        content: `## 📊 O que é?

Os **Atalhos de Teclado** permitem navegar e executar ações rapidamente sem usar o mouse.

---

## ⌨️ Atalhos Principais

| Atalho | Ação |
|--------|------|
| **Cmd/Ctrl + K** | Abre a barra de busca global |
| **?** | Exibe todos os atalhos disponíveis |
| **Esc** | Fecha modais e painéis laterais |
| **Enter** | Confirma ações em modais |

---

## 💡 Dica da IA

A barra de busca global (Cmd+K) entende linguagem natural:

- 📊 Digite "saldo" para ir direto ao fluxo de caixa
- 🛒 Digite "nova venda" para abrir o PDV
- 📝 Digite "pedido 1234" para buscar um pedido específico`
      }
    ]
  },
  configuracoes: {
    title: 'Configurações',
    icon: Settings,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    description: 'Personalize o sistema de acordo com as necessidades do seu negócio.',
    modules: [
      {
        id: 'cadastros',
        title: 'Cadastros Base',
        icon: Building2,
        content: `## 📊 O que é?

Os **Cadastros Base** são as configurações fundamentais que alimentam todo o sistema.

---

## 📝 Como usar?

**1. Plano de Contas**
   - Configure as contas contábeis e financeiras
   - Organize em níveis hierárquicos

**2. Centros de Custo**
   - Crie centros para análise gerencial
   - Vincule transações para rateio

**3. Clientes/Fornecedores (Counterparties)**
   - Cadastro unificado para ambos
   - Histórico de relacionamento completo

---

## 💡 Dica da IA

Cadastros bem configurados permitem análises mais precisas pela IA.`
      },
      {
        id: 'integracoes',
        title: 'Integrações e APIs',
        icon: Plug,
        content: `## 📊 O que é?

Conecte o Caixa Forte com outros sistemas e serviços financeiros.

---

## 📝 Integrações disponíveis

- **Open Banking**: Sincronize saldos e extratos automaticamente
- **Pix**: Receba e pague via QR Code
- **Antecipação de Recebíveis**: Integre com factorings
- **APIs REST**: Conecte sistemas externos
- **Webhooks**: Receba notificações em tempo real

---

## 💡 Dica da IA

A IA aproveita as integrações para:
- Conciliar automaticamente com Open Banking
- Detectar recebimentos Pix em tempo real
- Sincronizar dados com seu ERP legado`
      },
      {
        id: 'importar-exportar',
        title: 'Importar / Exportar',
        icon: Upload,
        content: `## 📊 O que é?

Migre dados e exporte relatórios em diversos formatos.

---

## 📝 Como usar?

**Importar:**
- Planilhas Excel (XLSX, CSV)
- Arquivos OFX (extratos bancários)
- Layouts CNAB (remessa/retorno)

**Exportar:**
- Relatórios em PDF
- Dados em Excel
- Backups completos

---

## 💡 Dica da IA

A IA valida importações e alerta sobre:
- Duplicidades detectadas
- Dados inconsistentes
- Formatação incorreta`
      }
    ]
  }
};

import { useSearchParams } from 'react-router-dom';

export default function Documentacao() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('categoria');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Map URL parameter to knowledgeBase keys
  const getCategoryKey = (param: string | null): string => {
    const categoryMapping: Record<string, string> = {
      'operacional': 'operacional',
      'suprimentos': 'suprimentos',
      'financeiro': 'financeiro',
      'controladoria-fiscal': 'fiscal',
      'inteligencia': 'inteligencia',
      'contratos': 'contratos',
      'projetos': 'projetos',
      'configuracoes': 'configuracoes',
    };
    return categoryMapping[param || ''] || 'financeiro';
  };
  
  const initialCategory = getCategoryKey(categoryParam);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([initialCategory]);
  
  // Get first module of the initial category
  const getInitialModule = (categoryKey: string): string | null => {
    const category = knowledgeBase[categoryKey as keyof typeof knowledgeBase];
    return category?.modules?.[0]?.id || 'conciliacao-bancaria';
  };
  
  const [selectedModule, setSelectedModule] = useState<string | null>(getInitialModule(initialCategory));

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryKey) 
        ? prev.filter(k => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  // Filter modules based on search
  const filteredCategories = Object.entries(knowledgeBase).map(([key, category]) => ({
    key,
    ...category,
    modules: category.modules.filter(module => 
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.modules.length > 0 || !searchQuery);

  // Get selected module content
  const getSelectedModuleContent = () => {
    for (const [, category] of Object.entries(knowledgeBase)) {
      const module = category.modules.find(m => m.id === selectedModule);
      if (module) return { module, category };
    }
    return null;
  };

  const selectedContent = getSelectedModuleContent();

  // Render markdown-like content
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let inList = false;
    let listItems: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 text-muted-foreground ml-4 my-2">
            {listItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
        listItems = [];
      }
      inList = false;
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
            <table className="min-w-full border border-border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  {tableRows[0].map((cell, i) => (
                    <th key={i} className="px-4 py-2 text-left text-sm font-medium">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(2).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-sm text-muted-foreground">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Table detection
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (!inTable) {
          flushList();
          inTable = true;
        }
        const cells = trimmedLine.slice(1, -1).split('|').map(c => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
      }

      // H2 headers with emoji
      if (trimmedLine.startsWith('## ')) {
        flushList();
        const text = trimmedLine.slice(3);
        elements.push(
          <h2 key={index} className="text-xl font-bold text-foreground mt-8 mb-4 flex items-center gap-2">
            {text}
          </h2>
        );
        return;
      }

      // H3 headers
      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-lg font-semibold text-foreground mt-6 mb-2">
            {trimmedLine.slice(4)}
          </h3>
        );
        return;
      }

      // Bold text with **
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        flushList();
        elements.push(
          <p key={index} className="font-semibold text-foreground my-2">
            {trimmedLine.slice(2, -2)}
          </p>
        );
        return;
      }

      // List items
      if (trimmedLine.startsWith('- ')) {
        inList = true;
        let itemText = trimmedLine.slice(2);
        // Handle bold in list items
        itemText = itemText.replace(/\*\*(.*?)\*\*/g, '$1');
        listItems.push(itemText);
        return;
      }

      // Numbered lists
      if (/^\d+\.\s/.test(trimmedLine)) {
        flushList();
        const text = trimmedLine.replace(/^\d+\.\s/, '');
        // Bold handling
        const parts = text.split(/\*\*(.*?)\*\*/g);
        elements.push(
          <p key={index} className="text-muted-foreground ml-4 my-1">
            <span className="text-primary font-medium">{trimmedLine.match(/^\d+/)?.[0]}.</span>{' '}
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
            )}
          </p>
        );
        return;
      }

      // Horizontal rule
      if (trimmedLine === '---') {
        flushList();
        elements.push(<hr key={index} className="my-6 border-border" />);
        return;
      }

      // Empty line
      if (trimmedLine === '') {
        flushList();
        return;
      }

      // Regular paragraph with bold text handling
      flushList();
      const parts = trimmedLine.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={index} className="text-muted-foreground my-2">
          {parts.map((part, i) => 
            i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
          )}
        </p>
      );
    });

    flushList();
    flushTable();

    return elements;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-violet-600 to-primary py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            📚 Central de Ajuda
          </h1>
          <p className="text-primary-foreground/80 text-lg mb-6">
            Manual operacional completo do Caixa Forte — seu guia para dominar o sistema
          </p>
          
          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar no manual... (ex: 'conciliação', 'NF-e', 'Rolling Forecast')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-card border-0 shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Categorias</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="px-4 pb-4 space-y-1">
                    {filteredCategories.map(category => {
                      const IconComponent = category.icon;
                      const isExpanded = expandedCategories.includes(category.key);
                      
                      return (
                        <Collapsible 
                          key={category.key} 
                          open={isExpanded}
                          onOpenChange={() => toggleCategory(category.key)}
                        >
                          <CollapsibleTrigger className="w-full">
                            <div className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                              'hover:bg-muted/60',
                              isExpanded && category.bgColor
                            )}>
                              <IconComponent className={cn('h-5 w-5', category.color)} />
                              <span className="flex-1 text-left font-medium text-sm">
                                {category.title}
                              </span>
                              {isExpanded 
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              }
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-8 mt-1 space-y-1">
                              {category.modules.map(module => {
                                const ModuleIcon = module.icon;
                                return (
                                  <button
                                    key={module.id}
                                    onClick={() => setSelectedModule(module.id)}
                                    className={cn(
                                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                                      'hover:bg-muted',
                                      selectedModule === module.id 
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-muted-foreground'
                                    )}
                                  >
                                    <ModuleIcon className="h-4 w-4" />
                                    {module.title}
                                  </button>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedContent ? (
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center',
                      selectedContent.category.bgColor
                    )}>
                      <selectedContent.module.icon className={cn('h-5 w-5', selectedContent.category.color)} />
                    </div>
                    <div>
                      <Badge variant="secondary" className="mb-1">
                        {selectedContent.category.title}
                      </Badge>
                      <CardTitle className="text-xl">
                        {selectedContent.module.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    {renderContent(selectedContent.module.content)}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Selecione um módulo
                </h3>
                <p className="text-muted-foreground">
                  Escolha um item no menu lateral para ver a documentação completa.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}