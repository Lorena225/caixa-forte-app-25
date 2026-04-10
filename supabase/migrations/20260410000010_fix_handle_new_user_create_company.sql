-- =====================================================
-- FIX: handle_new_user agora cria empresa e vincula usuário
-- Isso resolve o problema de empresas não aparecerem quando
-- o Supabase tem confirmação de email ativa (sem sessão no signUp)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_company_name TEXT;
BEGIN
  -- 1. Criar perfil do usuário
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Obter nome da empresa do metadata ou usar padrão
  v_company_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'company_name'), ''),
    'Minha Empresa'
  );

  -- 3. Criar empresa
  INSERT INTO public.companies (name)
  VALUES (v_company_name)
  RETURNING id INTO v_company_id;

  -- 4. Vincular usuário à empresa como admin
  INSERT INTO public.company_users (company_id, user_id, role, is_default)
  VALUES (v_company_id, NEW.id, 'admin', true);

  RETURN NEW;
END;
$$;
