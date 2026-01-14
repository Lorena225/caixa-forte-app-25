-- Recriar views com SECURITY INVOKER para respeitar RLS

DROP VIEW IF EXISTS public.v_produtos_estoque_minimo;
DROP VIEW IF EXISTS public.v_produtos_giro_estoque;
DROP VIEW IF EXISTS public.v_produtos_curva_abc;

CREATE VIEW public.v_produtos_estoque_minimo
WITH (security_invoker = true)
AS
SELECT e.id, e.produto_id, p.codigo, p.descricao as produto_nome, e.quantidade_atual, e.quantidade_disponivel, e.estoque_minimo, e.estoque_maximo,
  (e.estoque_minimo - e.quantidade_atual) as quantidade_repor, e.custo_medio, (e.estoque_minimo - e.quantidade_atual) * e.custo_medio as valor_reposicao, e.deposito, e.empresa_id
FROM public.estoque e JOIN public.produtos p ON p.id = e.produto_id
WHERE e.estoque_minimo IS NOT NULL AND e.quantidade_atual < e.estoque_minimo;

CREATE VIEW public.v_produtos_giro_estoque
WITH (security_invoker = true)
AS
SELECT e.produto_id, p.codigo, p.descricao as produto_nome, e.quantidade_atual, e.custo_medio, e.valor_total_estoque,
  COALESCE(mov.total_saidas, 0) as total_saidas_12m, COALESCE(mov.total_entradas, 0) as total_entradas_12m, COALESCE(mov.qtd_movimentacoes, 0) as qtd_movimentacoes,
  CASE WHEN e.quantidade_atual > 0 AND COALESCE(mov.total_saidas, 0) > 0 THEN ROUND((COALESCE(mov.total_saidas, 0) / e.quantidade_atual)::NUMERIC, 2) ELSE 0 END as giro_estoque,
  CASE WHEN COALESCE(mov.total_saidas, 0) > 0 THEN ROUND((e.quantidade_atual / (COALESCE(mov.total_saidas, 0) / 12))::NUMERIC, 0) ELSE NULL END as cobertura_meses, e.empresa_id
FROM public.estoque e JOIN public.produtos p ON p.id = e.produto_id
LEFT JOIN (SELECT produto_id, empresa_id, SUM(CASE WHEN tipo_movimentacao = 'saida' THEN quantidade ELSE 0 END) as total_saidas,
  SUM(CASE WHEN tipo_movimentacao = 'entrada' THEN quantidade ELSE 0 END) as total_entradas, COUNT(*) as qtd_movimentacoes
  FROM public.movimentacoes_estoque WHERE data_movimentacao >= CURRENT_DATE - INTERVAL '12 months' GROUP BY produto_id, empresa_id
) mov ON mov.produto_id = e.produto_id AND mov.empresa_id = e.empresa_id;

CREATE VIEW public.v_produtos_curva_abc
WITH (security_invoker = true)
AS
WITH valores_movimentados AS (
  SELECT m.produto_id, m.empresa_id, SUM(ABS(m.valor_total)) as valor_total_movimentado FROM public.movimentacoes_estoque m
  WHERE m.data_movimentacao >= CURRENT_DATE - INTERVAL '12 months' GROUP BY m.produto_id, m.empresa_id
),
ranking AS (
  SELECT v.*, SUM(v.valor_total_movimentado) OVER (PARTITION BY v.empresa_id ORDER BY v.valor_total_movimentado DESC) as acumulado,
    SUM(v.valor_total_movimentado) OVER (PARTITION BY v.empresa_id) as total_geral FROM valores_movimentados v
)
SELECT r.produto_id, p.codigo, p.descricao as produto_nome, r.valor_total_movimentado,
  ROUND((r.acumulado / NULLIF(r.total_geral, 0) * 100)::NUMERIC, 2) as percentual_acumulado,
  CASE WHEN (r.acumulado / NULLIF(r.total_geral, 0) * 100) <= 80 THEN 'A' WHEN (r.acumulado / NULLIF(r.total_geral, 0) * 100) <= 95 THEN 'B' ELSE 'C' END as curva,
  e.quantidade_atual, e.valor_total_estoque, r.empresa_id
FROM ranking r JOIN public.produtos p ON p.id = r.produto_id
LEFT JOIN public.estoque e ON e.produto_id = r.produto_id AND e.empresa_id = r.empresa_id
ORDER BY r.empresa_id, r.valor_total_movimentado DESC;