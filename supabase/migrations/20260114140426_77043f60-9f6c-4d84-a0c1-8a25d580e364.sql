-- Insert Vendas group and subitems into navigation_items
INSERT INTO public.navigation_items (key, label_default, route, icon, parent_key, sort_order, permission_key, feature_flag_key, hidden_by_default)
VALUES 
  ('vendas', 'Vendas', NULL, 'ShoppingCart', NULL, 35, NULL, NULL, false),
  ('vendas_nova', 'Nova Venda', '/vendas/nova', 'Plus', 'vendas', 1, NULL, NULL, false),
  ('vendas_pedidos', 'Pedidos', '/vendas/pedidos', 'FileText', 'vendas', 2, NULL, NULL, false),
  ('vendas_orcamentos', 'Orçamentos', '/vendas/orcamentos', 'ClipboardList', 'vendas', 3, NULL, NULL, false)
ON CONFLICT (key) DO UPDATE SET
  label_default = EXCLUDED.label_default,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  parent_key = EXCLUDED.parent_key,
  sort_order = EXCLUDED.sort_order;