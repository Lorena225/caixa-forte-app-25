// ============================================================
// API Authentication Middleware & Utilities
// Client-side utilities for API Key management
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import type { APIKey, RateLimitInfo, APIError } from '@/types/api';

// ==================== VALIDATION ====================

interface ValidationResult {
  valid: boolean;
  companyId?: string;
  scopes?: string[];
  rateLimitInfo?: RateLimitInfo;
  error?: APIError;
}

/**
 * Validate API Key (client-side check against database)
 * In production, this runs server-side via edge function
 */
export async function validateAPIKey(
  apiKey: string
): Promise<ValidationResult> {
  try {
    // Extract prefix for lookup
    const keyPrefix = apiKey.slice(0, 12);
    
    // Find API key by prefix
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .eq('is_active', true)
      .single();
    
    if (keyError || !keyData) {
      return {
        valid: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'API Key inválida ou não encontrada',
        },
      };
    }
    
    // Verify hash
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (computedHash !== keyData.key_hash) {
      return {
        valid: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'API Key inválida',
        },
      };
    }
    
    // Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return {
        valid: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'API Key expirada',
        },
      };
    }
    
    // Update last used
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);
    
    return {
      valid: true,
      companyId: keyData.company_id,
      scopes: keyData.scopes,
      rateLimitInfo: {
        limit_per_minute: keyData.rate_limit_per_minute,
        limit_per_day: keyData.rate_limit_per_day,
        remaining_minute: keyData.rate_limit_per_minute, // Would be calculated server-side
        remaining_day: keyData.rate_limit_per_day,
        reset_at: new Date(Date.now() + 60000).toISOString(),
      },
    };
  } catch (error) {
    console.error('Error validating API key:', error);
    return {
      valid: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro ao validar API Key',
      },
    };
  }
}

/**
 * Check if API key has required scope
 */
export function hasScope(userScopes: string[], requiredScope: string): boolean {
  // Check exact match
  if (userScopes.includes(requiredScope)) return true;
  
  // Check wildcard (e.g., financeiro:* matches financeiro:read)
  const [category] = requiredScope.split(':');
  if (userScopes.includes(`${category}:*`)) return true;
  
  // Check admin wildcard
  if (userScopes.includes('admin:*')) return true;
  
  return false;
}

/**
 * Check multiple scopes (any match)
 */
export function hasAnyScope(userScopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.some(scope => hasScope(userScopes, scope));
}

/**
 * Check multiple scopes (all required)
 */
export function hasAllScopes(userScopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.every(scope => hasScope(userScopes, scope));
}

// ==================== KEY GENERATION ====================

/**
 * Generate a new API key
 */
export function generateAPIKey(): { key: string; prefix: string } {
  const uuid1 = crypto.randomUUID().replace(/-/g, '');
  const uuid2 = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  const key = `cf_${uuid1}${uuid2}`;
  const prefix = key.slice(0, 12);
  
  return { key, prefix };
}

/**
 * Hash an API key for storage
 */
export async function hashAPIKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
}

// ==================== WEBHOOK SIGNATURE ====================

/**
 * Create webhook signature for payload
 */
export async function signWebhookPayload(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, payloadData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await signWebhookPayload(payload, secret);
  return signature === expectedSignature;
}

// ==================== RATE LIMIT HELPERS ====================

interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit (would be called server-side)
 * This is a placeholder - actual implementation uses Supabase RPC
 */
export async function checkRateLimit(
  apiKeyId: string,
  windowMinutes: number = 1
): Promise<RateLimitCheck> {
  // In production, this calls the check_rate_limit RPC function
  // For now, return allowed
  return {
    allowed: true,
    remaining: 60,
    resetAt: new Date(Date.now() + windowMinutes * 60 * 1000),
  };
}

// ==================== LOGGING ====================

interface APILogEntry {
  api_key_id: string | null;
  company_id: string;
  method: string;
  endpoint: string;
  status_code: number;
  latency_ms?: number;
  error_message?: string;
  request_body?: Record<string, unknown>;
  response_body?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log API request (would be called server-side)
 */
export async function logAPIRequest(entry: APILogEntry): Promise<void> {
  try {
    await supabase.from('api_logs').insert({
      api_key_id: entry.api_key_id,
      company_id: entry.company_id,
      method: entry.method,
      endpoint: entry.endpoint,
      status_code: entry.status_code,
      latency_ms: entry.latency_ms,
      error_message: entry.error_message,
      request_body: entry.request_body as never,
      response_body: entry.response_body as never,
      user_agent: entry.user_agent,
    });
  } catch (error) {
    console.error('Failed to log API request:', error);
  }
}

// ==================== ERROR HELPERS ====================

export function createAPIError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIError {
  return { code, message, details };
}

export function formatAPIResponse<T>(
  data: T,
  meta?: { page: number; limit: number; total: number }
) {
  return {
    success: true,
    data,
    meta: meta ? {
      ...meta,
      total_pages: Math.ceil(meta.total / meta.limit),
    } : undefined,
  };
}

export function formatAPIError(error: APIError, statusCode: number = 400) {
  return {
    success: false,
    error,
    statusCode,
  };
}
