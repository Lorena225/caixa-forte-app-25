
-- =============================================
-- FIX: Views must inherit RLS from base tables
-- Recreate views with SECURITY INVOKER
-- =============================================

-- =============================================
-- 1. AUDIT_LOGS_SAFE - Recreate with SECURITY INVOKER
-- =============================================
DROP VIEW IF EXISTS public.audit_logs_safe;

CREATE VIEW public.audit_logs_safe 
WITH (security_invoker = on) AS
SELECT 
    id,
    company_id,
    table_name,
    record_id,
    action,
    CASE
        WHEN (sensitivity_level = 'high' AND NOT has_role(auth.uid(), 'admin')) 
        THEN '{"masked": "Access restricted to administrators"}'::jsonb
        ELSE old_data
    END AS old_data,
    CASE
        WHEN (sensitivity_level = 'high' AND NOT has_role(auth.uid(), 'admin')) 
        THEN '{"masked": "Access restricted to administrators"}'::jsonb
        ELSE new_data
    END AS new_data,
    user_id,
    sensitivity_level,
    created_at
FROM public.audit_logs;

-- Grant access
GRANT SELECT ON public.audit_logs_safe TO authenticated;

COMMENT ON VIEW public.audit_logs_safe IS 'Secure audit logs view with masked sensitive data - inherits RLS from audit_logs table';

-- =============================================
-- 2. COUNTERPARTIES_SAFE - Recreate with SECURITY INVOKER
-- =============================================
DROP VIEW IF EXISTS public.counterparties_safe;

CREATE VIEW public.counterparties_safe 
WITH (security_invoker = on) AS
SELECT 
    id,
    company_id,
    type,
    name,
    document,
    email,
    phone,
    is_active,
    created_at,
    updated_at,
    is_client,
    is_supplier,
    person_type,
    legal_name,
    trade_name,
    ie,
    ie_is_exempt,
    im,
    address_street,
    address_number,
    address_complement,
    address_neighborhood,
    address_city,
    address_state,
    address_zip,
    delivery_address_street,
    delivery_address_number,
    delivery_address_complement,
    delivery_address_neighborhood,
    delivery_address_city,
    delivery_address_state,
    delivery_address_zip,
    delivery_same_as_billing,
    contact_name,
    contact_phone,
    contact_email,
    finance_contact_name,
    finance_contact_phone,
    finance_contact_email,
    nf_email,
    payment_terms_payable,
    payment_terms_receivable,
    credit_limit,
    supplier_notes,
    client_notes,
    fiscal_ready,
    payment_ready,
    collection_ready,
    missing_fields_json,
    tax_regime,
    state_registration,
    state_registration_exempt,
    municipal_registration,
    suframa,
    operation_nature,
    bank_name AS bank_name_display,
    CASE
        WHEN (bank_account IS NOT NULL) THEN ('XXXX' || right(bank_account, 4))
        ELSE NULL
    END AS bank_account_masked,
    CASE
        WHEN (pix_key IS NOT NULL) THEN (pix_key_type || ': ***')
        ELSE NULL
    END AS pix_key_masked,
    (bank_code IS NOT NULL) AS has_bank_info,
    (pix_key IS NOT NULL) AS has_pix_key
FROM public.counterparties;

-- Grant access
GRANT SELECT ON public.counterparties_safe TO authenticated;

COMMENT ON VIEW public.counterparties_safe IS 'Secure counterparties view with masked bank data - inherits RLS from counterparties table';
