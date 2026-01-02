import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface KeyResult {
  key: string | null;
  source: 'company' | 'global' | null;
  error: string | null;
}

// Simple AES-256-GCM decryption using Web Crypto API
async function decryptKey(
  encryptedKey: string, 
  encryptionMeta: { iv: string; authTag: string; alg?: string },
  appKey: string
): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Derive key from APP_ENCRYPTION_KEY
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appKey.slice(0, 32).padEnd(32, '0')),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decode base64 values
  const iv = Uint8Array.from(atob(encryptionMeta.iv), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(encryptionMeta.authTag), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
  
  // Combine ciphertext and authTag (GCM format)
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    combined
  );
  
  return decoder.decode(decrypted);
}

// Simple AES-256-GCM encryption
export async function encryptKey(
  plainKey: string,
  appKey: string
): Promise<{ encryptedKey: string; encryptionMeta: { iv: string; authTag: string; alg: string; version: number } }> {
  const encoder = new TextEncoder();
  
  // Derive key from APP_ENCRYPTION_KEY
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appKey.slice(0, 32).padEnd(32, '0')),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encoder.encode(plainKey)
  );
  
  // Split ciphertext and authTag (last 16 bytes)
  const encryptedArray = new Uint8Array(encrypted);
  const ciphertext = encryptedArray.slice(0, -16);
  const authTag = encryptedArray.slice(-16);
  
  // Convert to base64
  const toBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));
  
  return {
    encryptedKey: toBase64(ciphertext),
    encryptionMeta: {
      iv: toBase64(iv),
      authTag: toBase64(authTag),
      alg: 'AES-256-GCM',
      version: 1
    }
  };
}

export async function resolveOpenAIKey(companyId: string): Promise<KeyResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const appEncryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');
  const globalOpenAIKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return { key: null, source: null, error: 'Missing Supabase configuration' };
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Try to get company's own key first
  const { data: companyKey, error: keyError } = await supabase
    .from('company_ai_keys')
    .select('encrypted_key, encryption_meta')
    .eq('company_id', companyId)
    .eq('provider', 'openai')
    .eq('is_active', true)
    .maybeSingle();
  
  if (keyError) {
    console.error('Error fetching company key:', keyError);
  }
  
  // If company has its own key, decrypt and use it
  if (companyKey?.encrypted_key && companyKey?.encryption_meta) {
    if (!appEncryptionKey) {
      return { key: null, source: null, error: 'APP_ENCRYPTION_KEY not configured for decryption' };
    }
    
    try {
      const decryptedKey = await decryptKey(
        companyKey.encrypted_key,
        companyKey.encryption_meta as { iv: string; authTag: string },
        appEncryptionKey
      );
      return { key: decryptedKey, source: 'company', error: null };
    } catch (e) {
      console.error('Error decrypting company key:', e);
      return { key: null, source: null, error: 'Failed to decrypt company key' };
    }
  }
  
  // Fallback to global key
  if (globalOpenAIKey && globalOpenAIKey !== 'DISABLED' && globalOpenAIKey.startsWith('sk-')) {
    return { key: globalOpenAIKey, source: 'global', error: null };
  }
  
  // No key available
  return { 
    key: null, 
    source: null, 
    error: 'AI_DISABLED_NO_KEY' 
  };
}

// Test OpenAI key by making a simple API call
export async function testOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (response.ok) {
      return { valid: true };
    }
    
    const errorData = await response.json();
    return { 
      valid: false, 
      error: errorData.error?.message || `HTTP ${response.status}` 
    };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Connection failed' };
  }
}
