-- ============================================
-- CENTROS DE CUSTO HIERÁRQUICOS (5 NÍVEIS CONFIGURÁVEIS)
-- Estrutura completa ERP com closure table e settings
-- ============================================

-- 1. Expandir tabela cost_centers
ALTER TABLE public.cost_centers
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS level_type text DEFAULT 'department',
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS path text NOT NULL DEFAULT '/',
  ADD COLUMN IF NOT EXISTS path_codes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_leaf boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_to date,
  ADD COLUMN IF NOT EXISTS manager_user_id uuid,
  ADD COLUMN IF NOT EXISTS tags_json jsonb DEFAULT '[]';

-- 2. Criar tabela de configurações de hierarquia
CREATE TABLE IF NOT EXISTS public.cost_center_hierarchy_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  levels_enabled integer NOT NULL DEFAULT 3 CHECK (levels_enabled BETWEEN 1 AND 5),
  level_labels_json jsonb NOT NULL DEFAULT '{"1":"Unidade de Negócio","2":"Departamento","3":"Centro de Custo","4":"Projeto","5":"Fase"}',
  level_types_json jsonb NOT NULL DEFAULT '{"1":"business_unit","2":"department","3":"project","4":"project","5":"phase"}',
  posting_policy text NOT NULL DEFAULT 'leaf_only' CHECK (posting_policy IN ('leaf_only', 'any_level', 'level_range')),
  posting_level_min integer DEFAULT 1,
  posting_level_max integer DEFAULT 5,
  auto_create_root boolean NOT NULL DEFAULT true,
  code_policy_json jsonb DEFAULT '{"format":"alphanumeric","unique_per_level":false}',
  require_cost_center boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para settings
ALTER TABLE public.cost_center_hierarchy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company cc settings" ON public.cost_center_hierarchy_settings
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage cc settings" ON public.cost_center_hierarchy_settings
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Criar closure table para rollups eficientes
CREATE TABLE IF NOT EXISTS public.cost_center_closure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ancestor_id uuid NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  descendant_id uuid NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  depth integer NOT NULL DEFAULT 0,
  UNIQUE (company_id, ancestor_id, descendant_id)
);

-- Índices para closure
CREATE INDEX IF NOT EXISTS idx_cc_closure_ancestor ON public.cost_center_closure (company_id, ancestor_id);
CREATE INDEX IF NOT EXISTS idx_cc_closure_descendant ON public.cost_center_closure (company_id, descendant_id);

-- RLS para closure
ALTER TABLE public.cost_center_closure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cc closure" ON public.cost_center_closure
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 4. Criar tabela de responsáveis
CREATE TABLE IF NOT EXISTS public.cost_center_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cost_center_id uuid NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  resp_role text NOT NULL DEFAULT 'manager' CHECK (resp_role IN ('manager', 'approver', 'viewer')),
  limits_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, cost_center_id, user_id)
);

-- RLS para responsáveis
ALTER TABLE public.cost_center_responsibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cc responsibles" ON public.cost_center_responsibles
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- 5. Índices para cost_centers
CREATE INDEX IF NOT EXISTS idx_cc_parent ON public.cost_centers (company_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_cc_level ON public.cost_centers (company_id, level);
CREATE INDEX IF NOT EXISTS idx_cc_path ON public.cost_centers (company_id, path);
CREATE INDEX IF NOT EXISTS idx_cc_branch ON public.cost_centers (company_id, branch_id) WHERE branch_id IS NOT NULL;

-- 6. Função para recalcular path e is_leaf
CREATE OR REPLACE FUNCTION public.update_cost_center_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_path text;
  v_parent_path_codes text;
  v_parent_level integer;
BEGIN
  -- Se tem parent_id, buscar dados do pai
  IF NEW.parent_id IS NOT NULL THEN
    SELECT path, path_codes, level INTO v_parent_path, v_parent_path_codes, v_parent_level
    FROM cost_centers WHERE id = NEW.parent_id;
    
    -- Validar nível
    IF v_parent_level IS NOT NULL AND NEW.level != v_parent_level + 1 THEN
      NEW.level := v_parent_level + 1;
    END IF;
    
    -- Construir path
    NEW.path := v_parent_path || NEW.id::text || '/';
    NEW.path_codes := CASE 
      WHEN v_parent_path_codes = '' THEN NEW.code
      ELSE v_parent_path_codes || '>' || NEW.code
    END;
    
    -- Marcar pai como não-folha
    UPDATE cost_centers SET is_leaf = false WHERE id = NEW.parent_id AND is_leaf = true;
  ELSE
    -- Nível 1 (raiz)
    NEW.level := 1;
    NEW.path := '/' || NEW.id::text || '/';
    NEW.path_codes := NEW.code;
  END IF;
  
  -- Verificar se é folha (não tem filhos)
  NEW.is_leaf := NOT EXISTS (
    SELECT 1 FROM cost_centers WHERE parent_id = NEW.id LIMIT 1
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para hierarquia
DROP TRIGGER IF EXISTS trg_update_cc_hierarchy ON public.cost_centers;
CREATE TRIGGER trg_update_cc_hierarchy
  BEFORE INSERT OR UPDATE OF parent_id, code ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cost_center_hierarchy();

-- 7. Função para manter closure table
CREATE OR REPLACE FUNCTION public.maintain_cost_center_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Inserir self-reference
    INSERT INTO cost_center_closure (company_id, ancestor_id, descendant_id, depth)
    VALUES (NEW.company_id, NEW.id, NEW.id, 0);
    
    -- Inserir ancestrais
    IF NEW.parent_id IS NOT NULL THEN
      INSERT INTO cost_center_closure (company_id, ancestor_id, descendant_id, depth)
      SELECT NEW.company_id, ancestor_id, NEW.id, depth + 1
      FROM cost_center_closure
      WHERE descendant_id = NEW.parent_id AND company_id = NEW.company_id;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    -- Remover ancestrais antigos (exceto self)
    DELETE FROM cost_center_closure
    WHERE descendant_id IN (
      SELECT descendant_id FROM cost_center_closure WHERE ancestor_id = NEW.id
    )
    AND ancestor_id IN (
      SELECT ancestor_id FROM cost_center_closure WHERE descendant_id = OLD.id AND ancestor_id != OLD.id
    )
    AND company_id = NEW.company_id;
    
    -- Inserir novos ancestrais
    IF NEW.parent_id IS NOT NULL THEN
      INSERT INTO cost_center_closure (company_id, ancestor_id, descendant_id, depth)
      SELECT NEW.company_id, p.ancestor_id, c.descendant_id, p.depth + c.depth + 1
      FROM cost_center_closure p
      CROSS JOIN cost_center_closure c
      WHERE p.descendant_id = NEW.parent_id
        AND c.ancestor_id = NEW.id
        AND p.company_id = NEW.company_id
        AND c.company_id = NEW.company_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Remover do closure
    DELETE FROM cost_center_closure
    WHERE descendant_id = OLD.id OR ancestor_id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para closure
DROP TRIGGER IF EXISTS trg_maintain_cc_closure ON public.cost_centers;
CREATE TRIGGER trg_maintain_cc_closure
  AFTER INSERT OR UPDATE OF parent_id OR DELETE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_cost_center_closure();

-- 8. Atualizar registros existentes
UPDATE public.cost_centers 
SET 
  path = '/' || id::text || '/',
  path_codes = code,
  level = 1,
  is_leaf = true
WHERE parent_id IS NULL;

-- Inserir closure para registros existentes
INSERT INTO public.cost_center_closure (company_id, ancestor_id, descendant_id, depth)
SELECT company_id, id, id, 0 FROM public.cost_centers
ON CONFLICT (company_id, ancestor_id, descendant_id) DO NOTHING;

-- 9. View para árvore completa com labels
CREATE OR REPLACE VIEW public.v_cost_center_tree AS
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