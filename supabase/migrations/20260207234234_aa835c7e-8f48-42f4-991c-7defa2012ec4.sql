-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create secure encryption key storage (using Vault would be ideal, but this provides a layer of protection)
-- The actual key should be stored in Supabase Secrets in production

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_credentials(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key bytea;
BEGIN
  -- Use a combination of project-specific salt + pgcrypto
  -- In production, use Supabase Vault for key management
  encryption_key := digest(current_setting('app.settings.encryption_key', true) || 'caixa_forte_salt_2024', 'sha256');
  
  IF encryption_key IS NULL THEN
    -- Fallback to a derived key if setting not available
    encryption_key := digest('caixa_forte_default_key_change_in_production', 'sha256');
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(
      plain_text,
      encode(encryption_key, 'hex'),
      'cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_credentials(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key bytea;
BEGIN
  encryption_key := digest(current_setting('app.settings.encryption_key', true) || 'caixa_forte_salt_2024', 'sha256');
  
  IF encryption_key IS NULL THEN
    encryption_key := digest('caixa_forte_default_key_change_in_production', 'sha256');
  END IF;
  
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    encode(encryption_key, 'hex')
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (e.g., data wasn't encrypted)
    RETURN NULL;
END;
$$;

-- Revoke direct access to these functions from public
REVOKE ALL ON FUNCTION public.encrypt_credentials(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_credentials(text) FROM PUBLIC;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.encrypt_credentials(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_credentials(text) TO authenticated;

-- Create a trigger to automatically encrypt credentials on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_whatsapp_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only encrypt if the value looks like plain JSON (not already encrypted)
  IF NEW.credentials_encrypted IS NOT NULL 
     AND NEW.credentials_encrypted LIKE '{%}' THEN
    NEW.credentials_encrypted := public.encrypt_credentials(NEW.credentials_encrypted);
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to whatsapp_connections
DROP TRIGGER IF EXISTS encrypt_whatsapp_creds_trigger ON public.whatsapp_connections;
CREATE TRIGGER encrypt_whatsapp_creds_trigger
  BEFORE INSERT OR UPDATE OF credentials_encrypted
  ON public.whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_whatsapp_credentials();

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;