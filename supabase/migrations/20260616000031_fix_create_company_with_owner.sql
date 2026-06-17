-- RPC ausente que o frontend chamava (BrandLogo → criar nova empresa).
-- Sem ela, criar empresa quebrava. Cria a empresa e vincula o usuário como admin.
CREATE OR REPLACE FUNCTION public.create_company_with_owner(p_name TEXT, p_cnpj TEXT DEFAULT NULL)
RETURNS public.companies LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company public.companies%ROWTYPE; v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'Nome da empresa é obrigatório'; END IF;
  INSERT INTO public.companies(name, cnpj) VALUES (btrim(p_name), p_cnpj) RETURNING * INTO v_company;
  INSERT INTO public.company_users(company_id, user_id, role)
  VALUES (v_company.id, v_uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN v_company;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_company_with_owner(TEXT,TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_with_owner(TEXT,TEXT) TO authenticated;
