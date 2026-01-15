
-- Corrigir a view v_settlement_history para usar SECURITY INVOKER
DROP VIEW IF EXISTS public.v_settlement_history;

CREATE VIEW public.v_settlement_history
WITH (security_invoker=on) AS
SELECT 
    si.id,
    si.company_id,
    si.settlement_id,
    si.transaction_id,
    (s.settlement_type)::text AS settlement_type,
    (s.origin)::text AS origin,
    s.settlement_date,
    s.user_id,
    (s.status)::text AS settlement_status,
    s.is_reversal,
    s.notes,
    si.amount_settled,
    si.interest,
    si.penalty,
    si.discount,
    si.fx_difference,
    si.previous_balance,
    si.new_balance,
    si.created_at
FROM settlement_items si
JOIN settlements s ON s.id = si.settlement_id
ORDER BY si.created_at DESC;

-- Adicionar comentário documentando a view
COMMENT ON VIEW public.v_settlement_history IS 'Histórico de baixas com detalhes das liquidações - SECURITY INVOKER ativo';
