-- IA de dashboard (fase 1: determinística, sem custo de API).
-- ai_dashboard_insights: analisa dados reais e retorna insights com severidade,
-- mensagem e ação sugerida (caixa vs obrigações 7d, inadimplência, tendência de
-- receita). Retorna has_data:false honestamente quando não há dados — a UI mostra
-- o estado-guia, nunca insight fabricado sobre banco vazio.
CREATE OR REPLACE FUNCTION public.ai_dashboard_insights(p_company_id UUID, p_scope TEXT DEFAULT 'executive')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  insights JSON[] := '{}';
  v_receivable_overdue NUMERIC; v_receivable_total NUMERIC;
  v_payable_7d NUMERIC; v_cash NUMERIC;
  v_revenue_month NUMERIC; v_revenue_prev NUMERIC;
  v_start DATE := date_trunc('month', CURRENT_DATE)::date;
  v_prev_start DATE := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date;
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.transactions WHERE company_id = p_company_id;
  IF v_count = 0 THEN RETURN json_build_object('has_data', false, 'insights', '[]'::json); END IF;

  SELECT COALESCE(SUM(CASE WHEN direction::text='entrada' THEN total_amount ELSE -total_amount END),0)
    INTO v_cash FROM public.transactions WHERE company_id=p_company_id AND status::text='pago';
  SELECT COALESCE(SUM(balance_amount) FILTER (WHERE due_date < CURRENT_DATE),0), COALESCE(SUM(balance_amount),0)
    INTO v_receivable_overdue, v_receivable_total FROM public.transactions
   WHERE company_id=p_company_id AND direction::text='entrada' AND status::text='lancado' AND balance_amount>0;
  SELECT COALESCE(SUM(balance_amount) FILTER (WHERE due_date <= CURRENT_DATE+7),0)
    INTO v_payable_7d FROM public.transactions
   WHERE company_id=p_company_id AND direction::text='saida' AND status::text='lancado' AND balance_amount>0;
  SELECT COALESCE(SUM(total_amount) FILTER (WHERE direction::text='entrada'),0) INTO v_revenue_month
    FROM public.transactions WHERE company_id=p_company_id AND transaction_date>=v_start AND status::text IN ('lancado','pago');
  SELECT COALESCE(SUM(total_amount) FILTER (WHERE direction::text='entrada'),0) INTO v_revenue_prev
    FROM public.transactions WHERE company_id=p_company_id AND transaction_date>=v_prev_start AND transaction_date<v_start AND status::text IN ('lancado','pago');

  IF v_payable_7d > 0 AND v_cash < v_payable_7d THEN
    insights := insights || json_build_object('severity','alta','icon','alert',
      'title','Caixa pode não cobrir contas dos próximos 7 dias',
      'description','Há '||to_char(v_payable_7d,'FM999G999G990D00')||' a pagar em 7 dias e o caixa atual é menor. Antecipe recebimentos ou renegocie prazos.',
      'action','Ver projeção de fluxo','scope','cashflow');
  END IF;
  IF v_receivable_total > 0 AND (v_receivable_overdue / v_receivable_total) > 0.3 THEN
    insights := insights || json_build_object('severity','alta','icon','trending-down',
      'title','Mais de 30% dos recebíveis estão vencidos',
      'description',to_char(round((v_receivable_overdue/v_receivable_total)*100),'FM990')||'% do total a receber está em atraso. Acione a régua de cobrança.',
      'action','Abrir cobrança','scope','ar');
  ELSIF v_receivable_overdue > 0 THEN
    insights := insights || json_build_object('severity','media','icon','clock',
      'title','Há recebíveis vencidos',
      'description',to_char(v_receivable_overdue,'FM999G999G990D00')||' em atraso. Vale priorizar a cobrança desses títulos.',
      'action','Abrir cobrança','scope','ar');
  END IF;
  IF v_revenue_prev > 0 THEN
    IF v_revenue_month > v_revenue_prev * 1.1 THEN
      insights := insights || json_build_object('severity','positiva','icon','trending-up',
        'title','Receita em crescimento',
        'description','A receita do mês já supera a do mês anterior em '||to_char(round(((v_revenue_month/v_revenue_prev)-1)*100),'FM990')||'%. Bom momento para investir em captação.',
        'action',null,'scope','executive');
    ELSIF v_revenue_month < v_revenue_prev * 0.8 AND CURRENT_DATE > v_start + 20 THEN
      insights := insights || json_build_object('severity','media','icon','trending-down',
        'title','Receita do mês abaixo do mês anterior',
        'description','A receita está '||to_char(round((1-(v_revenue_month/v_revenue_prev))*100),'FM990')||'% abaixo. Revise o funil comercial e contratos a faturar.',
        'action','Ver contratos','scope','executive');
    END IF;
  END IF;
  RETURN json_build_object('has_data', true, 'insights', array_to_json(insights));
END $$;
REVOKE EXECUTE ON FUNCTION public.ai_dashboard_insights(UUID,TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_dashboard_insights(UUID,TEXT) TO authenticated, service_role;
