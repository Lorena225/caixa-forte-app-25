# Auditoria Total — Vitrio ERP

Data: 2026-06-16 · Executada contra o banco e o repositório reais (não suposições).

## 1. Diagnóstico executivo

Sistema **maduro e bem-estruturado na base**, com pontos de atenção em legado e
versionamento (este último corrigido nesta auditoria).

Números reais do banco de produção:

| Objeto | Quantidade |
|---|---|
| Tabelas | 471 |
| Funções | 233 |
| Policies RLS | 1119 |
| Foreign keys | 1110 |
| Triggers | 244 |
| Views | 50 |

### Pontos fortes verificados (com query, não suposição)
- **Isolamento multiempresa íntegro**: 0 tabelas sem RLS; 0 tabelas com RLS habilitado mas sem policy.
- **Integridade referencial limpa**: 0 registros órfãos nas FKs auditadas (agency_accounts, agency_deliverables, projects, transactions).
- **Segurança de funções**: exposição a `anon` eliminada nas funções criadas.

### Riscos identificados
1. **Versionamento divergente** — CORRIGIDO nesta auditoria. Várias migrations aplicadas via ferramenta não tinham arquivo `.sql` correspondente no repositório (os arquivos existiam apenas como comentário-resumo). O DDL real das 7 tabelas de agência e das 7 funções de IA/dashboard/onboarding foi extraído do banco e versionado.
2. **Legado de tabelas órfãs** — 471 tabelas é excessivo para o escopo atual (Projetos/Financeiro/Fiscal/Agência). Há tabelas dos módulos removidos (CRM/Compras/Estoque/Produção) ainda no banco, sem uso no frontend. Não são risco de segurança (têm RLS), mas geram ruído de manutenção e custo cognitivo.
3. **Avisos do advisor** — ~198 funções `SECURITY DEFINER` executáveis por `authenticated` (esperado para o padrão do app) + 3 itens de configuração de plataforma (bucket público `company-assets`, extensão `pg_net` no schema público, proteção de senha vazada) a ajustar no painel do Supabase.

## 2. Coerência frontend × banco × regras de negócio

- A "conta de agência" é extensão 1:1 de `projects` — reuso correto, sem duplicação de responsabilidade.
- A automação `ai_provision_agency_account` foi testada ponta a ponta: gera projeto + onboarding + entregas recorrentes por template + kickoff.
- A rentabilidade da conta cruza o fee mensal com o custo real de horas aprovadas (`cost_rate_snapshot` do módulo Projetos) e o gasto de mídia — integração real, não visual.
- O estado vazio do dashboard é honesto (`has_data: false` → "—", não R$ 0,00 ao lado de valores).

## 3. Roadmap de correção

### Bloco 1 — Crítico (executado nesta auditoria)
- ✓ Reconciliar versionamento das migrations órfãs (DDL de agência + IA/dashboard/onboarding).

### Bloco 2 — Estrutural (recomendado)
- Remover ou arquivar as tabelas legadas dos módulos extintos (CRM/Compras/Estoque/Produção).
- Documentar o schema por módulo para reduzir o custo de manutenção das 471 tabelas.

### Bloco 3 — Fortalecimento técnico
- Ajustar os 3 itens de plataforma do advisor (bucket, pg_net, senha) no painel.
- Revisar as ~198 funções `SECURITY DEFINER` legadas caso a caso (não em massa, por risco).

### Bloco 4 — Melhoria contínua
- CI que aplica todas as migrations contra um banco limpo a cada PR (garante reprodutibilidade).
- Changelog e tags de release por marco de produto.

## 4. Checklist de validação no Supabase

- [x] Toda tabela `public` tem RLS habilitado
- [x] Toda tabela com RLS tem ao menos uma policy
- [x] Policies isolam por `company_id` via `company_users`
- [x] FKs sem registros órfãos (amostra auditada)
- [x] Funções criadas sem `EXECUTE` para `anon`
- [ ] Tabelas legadas removidas/arquivadas (pendente — Bloco 2)
- [ ] Itens de plataforma do advisor ajustados (pendente — Bloco 3)

## 5. Checklist de validação no GitHub

- [x] Working tree limpo, tudo enviado
- [x] DDL de agência versionado (era só comentário)
- [x] DDL de IA/dashboard/onboarding versionado (era só comentário)
- [x] Documento de auditoria versionado
- [ ] CHANGELOG por release (pendente)
- [ ] CI de migrations (pendente — Bloco 4)

## 6. Status final dos 3 itens de plataforma (auditoria 2026-06-16)

Reavaliação honesta após verificação direta no banco:

1. **extension_in_public (pg_net)** — pg_net ESTÁ no schema public, mas a extensão
   **não suporta `ALTER EXTENSION ... SET SCHEMA`** (limitação da própria pg_net).
   Mover exigiria DROP + CREATE no schema `extensions`. Verificado: **0 funções
   usam net.http\*** — o aviso é de baixo risco (extensão sem uso). Decisão: não
   forçar drop/recreate de extensão de rede em produção sem necessidade, pois
   introduz mais risco que o próprio aviso. Reavaliar se/quando pg_net for usado.

2. **public_bucket_allows_listing (company-assets)** — bucket é público (serve
   logos/assets). Tornar privado quebraria a exibição. Requer ajuste de policy de
   storage no painel, com cuidado para preservar leitura pública dos assets
   legítimos. Mantido como ação de painel.

3. **auth_leaked_password_protection** — ação exclusiva do painel Supabase
   (Auth > Settings > habilitar proteção contra senha vazada). Não há SQL.

Os 208 avisos `authenticated_security_definer_function_executable` são esperados
(é como o app chama as RPCs) e não representam falha.
