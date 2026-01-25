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
  Lightbulb
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
    description: 'Gestão de compras, fornecedores e cotações.',
    modules: [
      {
        id: 'compras',
        title: 'Pedidos de Compra',
        icon: FileText,
        content: `## 📊 O que é?

O módulo de **Pedidos de Compra** gerencia todo o processo de aquisição de produtos e serviços.

---

## 📝 Como usar? (Passo a Passo)

**1. Crie um pedido de compra**
   - Navegue para: **Suprimentos > Pedidos de Compra**
   - Clique em "Novo Pedido"
   - Selecione o fornecedor

**2. Adicione itens**
   - Busque produtos pelo nome ou código
   - Informe quantidade e preço negociado
   - Adicione condições de pagamento

**3. Envie para aprovação**
   - Pedidos acima do limite requerem aprovação
   - Aprovadores recebem notificação

**4. Acompanhe o recebimento**
   - Ao receber, faça a conferência
   - Recebimento parcial é permitido
   - Divergências geram alerta

---

## 💡 Dica da IA

O CFO Virtual otimiza suas compras:

- 📊 Compara preços entre fornecedores
- 📅 Sugere melhor momento para comprar
- ⚠️ Alerta sobre fornecedores com atraso recorrente`
      },
      {
        id: 'fornecedores',
        title: 'Gestão de Fornecedores',
        icon: Users,
        content: `## 📊 O que é?

A **Gestão de Fornecedores** centraliza informações e avalia o desempenho de cada parceiro comercial.

---

## 📝 Como usar? (Passo a Passo)

**1. Cadastre um fornecedor**
   - Navegue para: **Suprimentos > Fornecedores**
   - Clique em "Novo Fornecedor"
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
- 🔄 Sugere alternativas quando há problemas recorrentes`
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

export default function Documentacao() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['financeiro']);
  const [selectedModule, setSelectedModule] = useState<string | null>('conciliacao-bancaria');

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