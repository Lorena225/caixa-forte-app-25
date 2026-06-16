-- Processamento de domínio do webhook de pagamento (Pagar.me).
-- ai_process_payment_event: registra evento idempotente em payment_events e,
-- se for pagamento confirmado com transação vinculada (via external_entities_map),
-- dá baixa automática em contas a receber (status lancado → pago).
-- Chamada pela edge function webhook-worker após validar assinatura HMAC.
-- Testada: registro, idempotência e caminho sem-vínculo OK.

-- Segurança: esta função pegou EXECUTE via PUBLIC (não anon direto). Revoga de PUBLIC.
REVOKE EXECUTE ON FUNCTION public.ai_process_payment_event(UUID,TEXT,TEXT,TEXT,NUMERIC,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_process_payment_event(UUID,TEXT,TEXT,TEXT,NUMERIC,JSONB) TO authenticated, service_role;
