-- Corrigir view para usar SECURITY INVOKER
DROP VIEW IF EXISTS public.v_cost_center_tree;

CREATE VIEW public.v_cost_center_tree WITH (security_invoker = true) AS
SELECT 
  cc.id,
  cc.company_id,
  cc.code,
  cc.name,
  cc.level,
  cc.level_type,
  cc.parent_id,
  cc.path,
  cc.path_codes,
  cc.is_leaf,
  cc.is_active,
  cc.branch_id,
  b.name as branch_name,
  cc.valid_from,
  cc.valid_to,
  cc.manager_user_id,
  cc.tags_json,
  COALESCE(
    (settings.level_labels_json->>cc.level::text),
    CASE cc.level
      WHEN 1 THEN 'Unidade de Negócio'
      WHEN 2 THEN 'Departamento'
      WHEN 3 THEN 'Centro de Custo'
      WHEN 4 THEN 'Projeto'
      WHEN 5 THEN 'Fase'
    END
  ) as level_label,
  (SELECT COUNT(*) FROM cost_centers child WHERE child.parent_id = cc.id) as children_count
FROM public.cost_centers cc
LEFT JOIN public.branches b ON b.id = cc.branch_id
LEFT JOIN public.cost_center_hierarchy_settings settings ON settings.company_id = cc.company_id
ORDER BY cc.path;