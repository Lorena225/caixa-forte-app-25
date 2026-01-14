
-- Adicionar itens de navegação para o módulo financeiro avançado
-- Parent 'financeiro' para operações financeiras e 'group.admin' para configurações

INSERT INTO public.navigation_items (key, label_default, route, icon, parent_key, sort_order, hidden_by_default)
VALUES 
  ('financeiro', 'Operação Financeira', NULL, 'Wallet', NULL, 25, false),
  ('financeiro.conciliacao', 'Conciliação Bancária', '/financeiro/conciliacao-bancaria', 'GitCompare', 'financeiro', 1, false),
  ('financeiro.custos', 'Análise de Custos', '/financeiro/analise-custos', 'TrendingDown', 'financeiro', 2, false),
  ('financeiro.orcamento', 'Orçamento vs Real', '/financeiro/orcamento-real', 'Target', 'financeiro', 3, false),
  ('financeiro.investimentos', 'Investimentos', '/financeiro/investimentos', 'PiggyBank', 'financeiro', 4, false),
  ('admin.moedas', 'Moedas e Câmbio', '/configuracoes/moedas', 'Coins', 'group.admin', 15, false)
ON CONFLICT (key) DO UPDATE SET 
  label_default = EXCLUDED.label_default,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  parent_key = EXCLUDED.parent_key,
  sort_order = EXCLUDED.sort_order;
