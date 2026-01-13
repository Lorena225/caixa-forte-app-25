-- Fix 1: Create secure view for counterparties excluding sensitive bank/PIX fields
-- This allows application access to non-sensitive data while protecting payment credentials

-- Create secure view with SECURITY INVOKER that excludes sensitive fields
CREATE OR REPLACE VIEW public.counterparties_safe 
WITH (security_invoker=on) AS
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
  -- Address fields (non-sensitive business data)
  address_street,
  address_number,
  address_complement,
  address_neighborhood,
  address_city,
  address_state,
  address_zip,
  -- Delivery address
  delivery_address_street,
  delivery_address_number,
  delivery_address_complement,
  delivery_address_neighborhood,
  delivery_address_city,
  delivery_address_state,
  delivery_address_zip,
  delivery_same_as_billing,
  -- Contact info
  contact_name,
  contact_phone,
  contact_email,
  finance_contact_name,
  finance_contact_phone,
  finance_contact_email,
  nf_email,
  -- Payment terms (non-sensitive)
  payment_terms_payable,
  payment_terms_receivable,
  credit_limit,
  -- Notes
  supplier_notes,
  client_notes,
  -- Readiness flags
  fiscal_ready,
  payment_ready,
  collection_ready,
  missing_fields_json,
  -- Tax info
  tax_regime,
  state_registration,
  state_registration_exempt,
  municipal_registration,
  suframa,
  operation_nature,
  -- Masked bank info (show only bank name, mask account)
  bank_name as bank_name_display,
  CASE WHEN bank_account IS NOT NULL THEN 
    'XXXX' || RIGHT(bank_account, 4) 
  ELSE NULL END as bank_account_masked,
  CASE WHEN pix_key IS NOT NULL THEN 
    pix_key_type || ': ***' 
  ELSE NULL END as pix_key_masked,
  -- Boolean flags for presence check without exposing values
  (bank_code IS NOT NULL) as has_bank_info,
  (pix_key IS NOT NULL) as has_pix_key
FROM public.counterparties;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.counterparties_safe TO authenticated;

-- Fix 2: Add RLS policies to storage.objects for whatsapp-files bucket
-- This ensures files are only accessible by members of the owning company

-- Policy for SELECT - company members can view their own files
CREATE POLICY "Company members can view own whatsapp files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whatsapp-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.companies 
    WHERE public.user_has_company_access(id)
  )
);

-- Policy for INSERT - company members can upload to their own folder
CREATE POLICY "Company members can upload whatsapp files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.companies 
    WHERE public.user_has_company_access(id)
  )
);

-- Policy for UPDATE - company members can update their own files
CREATE POLICY "Company members can update own whatsapp files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'whatsapp-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.companies 
    WHERE public.user_has_company_access(id)
  )
);

-- Policy for DELETE - company members can delete their own files
CREATE POLICY "Company members can delete own whatsapp files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'whatsapp-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.companies 
    WHERE public.user_has_company_access(id)
  )
);