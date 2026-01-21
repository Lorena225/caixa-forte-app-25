
-- =====================================================
-- MODULE 2.9: CREDIT MANAGEMENT - REMAINING ELEMENTS
-- =====================================================

-- Drop and recreate the trigger properly
DROP TRIGGER IF EXISTS trg_update_credit_utilization ON public.transactions;

-- Function to calculate credit score
CREATE OR REPLACE FUNCTION public.calculate_credit_score(p_counterparty_id UUID, p_company_id UUID)
RETURNS TABLE (
    score INTEGER,
    rating TEXT,
    risk_level TEXT,
    default_probability NUMERIC,
    factors JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_payment_history_score NUMERIC := 0;
    v_dso_days NUMERIC := 0;
    v_on_time_rate NUMERIC := 0;
    v_total_invoiced NUMERIC := 0;
    v_total_paid NUMERIC := 0;
    v_days_overdue_now INTEGER := 0;
    v_years_customer NUMERIC := 0;
    v_final_score INTEGER;
    v_rating TEXT;
    v_risk TEXT;
    v_prob NUMERIC;
    v_factors JSONB;
BEGIN
    -- Get payment history metrics from transactions
    SELECT 
        COUNT(*) FILTER (WHERE t.status = 'pago'),
        COALESCE(AVG(CASE WHEN t.paid_date IS NOT NULL THEN 
            EXTRACT(DAY FROM t.paid_date::timestamp - t.due_date::timestamp) 
        END), 0),
        SUM(t.amount) FILTER (WHERE t.status = 'pago'),
        SUM(t.amount),
        COUNT(*) FILTER (WHERE t.status = 'pago' AND t.paid_date <= t.due_date)::NUMERIC / 
            NULLIF(COUNT(*) FILTER (WHERE t.status = 'pago'), 0),
        MAX(CASE WHEN t.status IN ('lancado', 'rascunho') AND t.due_date < CURRENT_DATE THEN 
            CURRENT_DATE - t.due_date 
        ELSE 0 END)
    INTO 
        v_payment_history_score,
        v_dso_days,
        v_total_paid,
        v_total_invoiced,
        v_on_time_rate,
        v_days_overdue_now
    FROM public.transactions t
    WHERE t.counterparty_id = p_counterparty_id 
      AND t.company_id = p_company_id
      AND t.direction = 'receivable';

    -- Years as customer
    SELECT EXTRACT(YEAR FROM AGE(now(), MIN(created_at)))
    INTO v_years_customer
    FROM public.transactions
    WHERE counterparty_id = p_counterparty_id AND company_id = p_company_id;

    -- Calculate score components
    v_payment_history_score := LEAST(100, COALESCE(v_payment_history_score, 0) * 2);
    v_on_time_rate := COALESCE(v_on_time_rate, 0.5) * 100;

    v_final_score := LEAST(1000, GREATEST(0, (
        (v_payment_history_score * 0.40) +
        (v_on_time_rate * 0.25) +
        (GREATEST(0, 100 - v_dso_days) * 0.15) +
        (GREATEST(0, 100 - v_days_overdue_now) * 0.15) +
        (LEAST(10, COALESCE(v_years_customer, 0)) * 10 * 0.05)
    ) * 10))::INTEGER;

    v_rating := CASE
        WHEN v_final_score >= 900 THEN 'AAA'
        WHEN v_final_score >= 800 THEN 'AA'
        WHEN v_final_score >= 700 THEN 'A'
        WHEN v_final_score >= 600 THEN 'BBB'
        WHEN v_final_score >= 500 THEN 'BB'
        WHEN v_final_score >= 400 THEN 'B'
        WHEN v_final_score >= 300 THEN 'CCC'
        WHEN v_final_score >= 200 THEN 'CC'
        WHEN v_final_score >= 100 THEN 'C'
        ELSE 'D'
    END;

    v_risk := CASE
        WHEN v_final_score >= 700 THEN 'LOW'
        WHEN v_final_score >= 500 THEN 'MEDIUM'
        WHEN v_final_score >= 300 THEN 'HIGH'
        ELSE 'CRITICAL'
    END;

    v_prob := CASE
        WHEN v_final_score >= 900 THEN 0.001
        WHEN v_final_score >= 800 THEN 0.005
        WHEN v_final_score >= 700 THEN 0.01
        WHEN v_final_score >= 600 THEN 0.02
        WHEN v_final_score >= 500 THEN 0.05
        WHEN v_final_score >= 400 THEN 0.10
        WHEN v_final_score >= 300 THEN 0.20
        WHEN v_final_score >= 200 THEN 0.35
        WHEN v_final_score >= 100 THEN 0.50
        ELSE 0.75
    END;

    v_factors := jsonb_build_object(
        'payment_history_score', ROUND(v_payment_history_score),
        'dso_days', ROUND(v_dso_days),
        'on_time_payment_rate', ROUND(COALESCE(v_on_time_rate, 50) / 100, 2),
        'total_invoiced', COALESCE(v_total_invoiced, 0),
        'total_paid', COALESCE(v_total_paid, 0),
        'days_in_overdue', COALESCE(v_days_overdue_now, 0),
        'years_as_customer', COALESCE(v_years_customer, 0),
        'calculated_at', now()
    );

    RETURN QUERY SELECT v_final_score, v_rating, v_risk, v_prob, v_factors;
END;
$$;

-- Function to update credit profile with new score
CREATE OR REPLACE FUNCTION public.update_credit_profile_score(p_counterparty_id UUID, p_company_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id UUID;
    v_score_data RECORD;
    v_old_score INTEGER;
    v_old_limit NUMERIC;
    v_new_limit NUMERIC;
BEGIN
    SELECT id, credit_score, credit_limit INTO v_profile_id, v_old_score, v_old_limit
    FROM public.credit_profiles
    WHERE counterparty_id = p_counterparty_id AND company_id = p_company_id;

    SELECT * INTO v_score_data FROM public.calculate_credit_score(p_counterparty_id, p_company_id);

    v_new_limit := COALESCE(v_old_limit, 0);
    IF v_score_data.score >= 700 AND v_old_limit > 0 THEN
        v_new_limit := v_old_limit * 1.1;
    ELSIF v_score_data.score < 400 AND v_old_limit > 0 THEN
        v_new_limit := v_old_limit * 0.8;
    END IF;

    IF v_profile_id IS NULL THEN
        INSERT INTO public.credit_profiles (
            company_id, counterparty_id, credit_score, credit_rating,
            risk_level, default_probability, scoring_factors, credit_limit
        ) VALUES (
            p_company_id, p_counterparty_id, v_score_data.score, v_score_data.rating,
            v_score_data.risk_level, v_score_data.default_probability, v_score_data.factors,
            GREATEST(0, v_new_limit)
        )
        RETURNING id INTO v_profile_id;
    ELSE
        UPDATE public.credit_profiles SET
            credit_score = v_score_data.score,
            credit_rating = v_score_data.rating,
            risk_level = v_score_data.risk_level,
            default_probability = v_score_data.default_probability,
            scoring_factors = v_score_data.factors,
            credit_limit = GREATEST(0, v_new_limit),
            expected_loss = credit_utilized * v_score_data.default_probability,
            last_score_update = now(),
            updated_at = now()
        WHERE id = v_profile_id;
    END IF;

    IF v_old_score IS NULL OR ABS(v_score_data.score - v_old_score) >= 10 THEN
        INSERT INTO public.credit_score_history (
            company_id, credit_profile_id, credit_score, credit_rating,
            credit_limit, risk_level, scoring_factors, change_reason
        ) VALUES (
            p_company_id, v_profile_id, v_score_data.score, v_score_data.rating,
            v_new_limit, v_score_data.risk_level, v_score_data.factors,
            CASE 
                WHEN v_old_score IS NULL THEN 'Initial scoring'
                WHEN v_score_data.score > v_old_score THEN 'Score improved'
                ELSE 'Score decreased'
            END
        );
    END IF;

    RETURN v_profile_id;
END;
$$;

-- Function to update portfolio summary
CREATE OR REPLACE FUNCTION public.update_credit_portfolio_summary(p_company_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.credit_portfolio_summary (
        company_id, summary_date,
        total_customers, total_credit_limit, total_utilized, average_utilization,
        customers_low_risk, customers_medium_risk, customers_high_risk, customers_critical_risk,
        customers_aaa, customers_aa, customers_a, customers_bbb, customers_bb,
        customers_b, customers_ccc, customers_cc, customers_c, customers_d,
        total_expected_loss, weighted_avg_default_prob
    )
    SELECT 
        p_company_id,
        CURRENT_DATE,
        COUNT(*),
        COALESCE(SUM(credit_limit), 0),
        COALESCE(SUM(credit_utilized), 0),
        COALESCE(AVG(utilization_rate), 0),
        COUNT(*) FILTER (WHERE risk_level = 'LOW'),
        COUNT(*) FILTER (WHERE risk_level = 'MEDIUM'),
        COUNT(*) FILTER (WHERE risk_level = 'HIGH'),
        COUNT(*) FILTER (WHERE risk_level = 'CRITICAL'),
        COUNT(*) FILTER (WHERE credit_rating = 'AAA'),
        COUNT(*) FILTER (WHERE credit_rating = 'AA'),
        COUNT(*) FILTER (WHERE credit_rating = 'A'),
        COUNT(*) FILTER (WHERE credit_rating = 'BBB'),
        COUNT(*) FILTER (WHERE credit_rating = 'BB'),
        COUNT(*) FILTER (WHERE credit_rating = 'B'),
        COUNT(*) FILTER (WHERE credit_rating = 'CCC'),
        COUNT(*) FILTER (WHERE credit_rating = 'CC'),
        COUNT(*) FILTER (WHERE credit_rating = 'C'),
        COUNT(*) FILTER (WHERE credit_rating = 'D'),
        COALESCE(SUM(expected_loss), 0),
        COALESCE(AVG(default_probability), 0)
    FROM public.credit_profiles
    WHERE company_id = p_company_id
    ON CONFLICT (company_id, summary_date) DO UPDATE SET
        total_customers = EXCLUDED.total_customers,
        total_credit_limit = EXCLUDED.total_credit_limit,
        total_utilized = EXCLUDED.total_utilized,
        average_utilization = EXCLUDED.average_utilization,
        customers_low_risk = EXCLUDED.customers_low_risk,
        customers_medium_risk = EXCLUDED.customers_medium_risk,
        customers_high_risk = EXCLUDED.customers_high_risk,
        customers_critical_risk = EXCLUDED.customers_critical_risk,
        customers_aaa = EXCLUDED.customers_aaa,
        customers_aa = EXCLUDED.customers_aa,
        customers_a = EXCLUDED.customers_a,
        customers_bbb = EXCLUDED.customers_bbb,
        customers_bb = EXCLUDED.customers_bb,
        customers_b = EXCLUDED.customers_b,
        customers_ccc = EXCLUDED.customers_ccc,
        customers_cc = EXCLUDED.customers_cc,
        customers_c = EXCLUDED.customers_c,
        customers_d = EXCLUDED.customers_d,
        total_expected_loss = EXCLUDED.total_expected_loss,
        weighted_avg_default_prob = EXCLUDED.weighted_avg_default_prob;
END;
$$;

-- Trigger to update credit utilization when transactions change
CREATE OR REPLACE FUNCTION public.update_credit_utilization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_counterparty_id UUID;
    v_company_id UUID;
BEGIN
    v_counterparty_id := COALESCE(NEW.counterparty_id, OLD.counterparty_id);
    v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    
    IF v_counterparty_id IS NOT NULL AND v_company_id IS NOT NULL THEN
        UPDATE public.credit_profiles cp SET
            credit_utilized = COALESCE((
                SELECT SUM(balance_amount)
                FROM public.transactions t
                WHERE t.counterparty_id = cp.counterparty_id
                  AND t.company_id = cp.company_id
                  AND t.direction = 'receivable'
                  AND t.status IN ('lancado', 'rascunho')
            ), 0),
            expected_loss = credit_utilized * default_probability,
            updated_at = now()
        WHERE cp.counterparty_id = v_counterparty_id
          AND cp.company_id = v_company_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_credit_utilization
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_credit_utilization();

-- Function to schedule collection actions
CREATE OR REPLACE FUNCTION public.schedule_collection_actions(
    p_transaction_id UUID,
    p_company_id UUID
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id UUID;
    v_counterparty_id UUID;
    v_due_date DATE;
    v_sequence JSONB;
    v_step JSONB;
    v_count INTEGER := 0;
BEGIN
    -- Get transaction details
    SELECT counterparty_id, due_date INTO v_counterparty_id, v_due_date
    FROM public.transactions
    WHERE id = p_transaction_id AND company_id = p_company_id;

    IF v_counterparty_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Get or create credit profile
    SELECT id INTO v_profile_id
    FROM public.credit_profiles
    WHERE counterparty_id = v_counterparty_id AND company_id = p_company_id;

    IF v_profile_id IS NULL THEN
        v_profile_id := public.update_credit_profile_score(v_counterparty_id, p_company_id);
    END IF;

    -- Get default collection sequence
    SELECT steps INTO v_sequence
    FROM public.collection_sequences
    WHERE company_id = p_company_id AND is_default = true AND is_active = true
    LIMIT 1;

    IF v_sequence IS NULL THEN
        v_sequence := '[
            {"days_overdue": -7, "action_type": "EMAIL_REMINDER"},
            {"days_overdue": 3, "action_type": "EMAIL_COLLECTION"},
            {"days_overdue": 7, "action_type": "SMS"},
            {"days_overdue": 15, "action_type": "PHONE_CALL"},
            {"days_overdue": 30, "action_type": "EMAIL_COLLECTION"},
            {"days_overdue": 60, "action_type": "LEGAL_NOTICE"},
            {"days_overdue": 90, "action_type": "PROTEST"}
        ]'::jsonb;
    END IF;

    -- Schedule each action
    FOR v_step IN SELECT * FROM jsonb_array_elements(v_sequence)
    LOOP
        INSERT INTO public.collection_actions (
            company_id, credit_profile_id, transaction_id,
            action_type, days_overdue, scheduled_for, status
        ) VALUES (
            p_company_id, v_profile_id, p_transaction_id,
            v_step->>'action_type',
            (v_step->>'days_overdue')::INTEGER,
            v_due_date + ((v_step->>'days_overdue')::INTEGER || ' days')::INTERVAL,
            'scheduled'
        )
        ON CONFLICT DO NOTHING;
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Function to calculate loss provision
CREATE OR REPLACE FUNCTION public.calculate_loss_provision(
    p_company_id UUID,
    p_period_start DATE,
    p_period_end DATE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_provision_id UUID;
    v_total_exposure NUMERIC;
    v_total_loss NUMERIC;
    v_provision_rate NUMERIC;
    v_breakdown_risk JSONB;
    v_breakdown_aging JSONB;
BEGIN
    -- Calculate total exposure and expected loss
    SELECT 
        COALESCE(SUM(credit_utilized), 0),
        COALESCE(SUM(expected_loss), 0)
    INTO v_total_exposure, v_total_loss
    FROM public.credit_profiles
    WHERE company_id = p_company_id;

    v_provision_rate := CASE WHEN v_total_exposure > 0 THEN v_total_loss / v_total_exposure ELSE 0 END;

    -- Breakdown by risk level
    SELECT jsonb_object_agg(risk_level, data) INTO v_breakdown_risk
    FROM (
        SELECT risk_level, jsonb_build_object(
            'count', COUNT(*),
            'exposure', SUM(credit_utilized),
            'expected_loss', SUM(expected_loss)
        ) as data
        FROM public.credit_profiles
        WHERE company_id = p_company_id
        GROUP BY risk_level
    ) sub;

    -- Breakdown by aging (from transactions)
    SELECT jsonb_build_object(
        'current', SUM(CASE WHEN due_date >= CURRENT_DATE THEN balance_amount ELSE 0 END),
        '1_30', SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30 THEN balance_amount ELSE 0 END),
        '31_60', SUM(CASE WHEN due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60 THEN balance_amount ELSE 0 END),
        '61_90', SUM(CASE WHEN due_date < CURRENT_DATE - 60 AND due_date >= CURRENT_DATE - 90 THEN balance_amount ELSE 0 END),
        'over_90', SUM(CASE WHEN due_date < CURRENT_DATE - 90 THEN balance_amount ELSE 0 END)
    ) INTO v_breakdown_aging
    FROM public.transactions
    WHERE company_id = p_company_id
      AND direction = 'receivable'
      AND status IN ('lancado', 'rascunho');

    -- Create provision record
    INSERT INTO public.loss_provisions (
        company_id, period_start, period_end,
        total_exposure, total_expected_loss, provision_rate, provision_amount,
        breakdown_by_risk, breakdown_by_aging
    ) VALUES (
        p_company_id, p_period_start, p_period_end,
        v_total_exposure, v_total_loss, v_provision_rate, v_total_loss,
        v_breakdown_risk, v_breakdown_aging
    )
    RETURNING id INTO v_provision_id;

    RETURN v_provision_id;
END;
$$;
