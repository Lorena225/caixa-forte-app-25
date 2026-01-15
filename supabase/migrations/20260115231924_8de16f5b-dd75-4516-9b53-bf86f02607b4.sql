-- Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_webhook_event()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
  ELSE
    v_company_id := NEW.company_id;
  END IF;

  INSERT INTO public.webhook_events (webhook_id, event_type, payload)
  SELECT 
    w.id,
    TG_ARGV[0]::text,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(NEW) END
  FROM public.webhooks w
  WHERE w.company_id = v_company_id
    AND TG_ARGV[0] = ANY(w.events)
    AND w.is_active = true;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for customer_invoices (faturas)
DROP TRIGGER IF EXISTS invoice_created_webhook ON public.customer_invoices;
CREATE TRIGGER invoice_created_webhook
AFTER INSERT ON public.customer_invoices
FOR EACH ROW EXECUTE FUNCTION public.trigger_webhook_event('fatura.criada');

DROP TRIGGER IF EXISTS invoice_updated_webhook ON public.customer_invoices;
CREATE TRIGGER invoice_updated_webhook
AFTER UPDATE ON public.customer_invoices
FOR EACH ROW EXECUTE FUNCTION public.trigger_webhook_event('fatura.atualizada');

DROP TRIGGER IF EXISTS invoice_paid_webhook ON public.customer_invoices;
CREATE TRIGGER invoice_paid_webhook
AFTER UPDATE ON public.customer_invoices
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid')
EXECUTE FUNCTION public.trigger_webhook_event('fatura.paga');

-- Create triggers for counterparties (clientes) - using correct enum 'cliente'
DROP TRIGGER IF EXISTS customer_created_webhook ON public.counterparties;
CREATE TRIGGER customer_created_webhook
AFTER INSERT ON public.counterparties
FOR EACH ROW WHEN (NEW.type = 'cliente')
EXECUTE FUNCTION public.trigger_webhook_event('cliente.criado');

DROP TRIGGER IF EXISTS customer_updated_webhook ON public.counterparties;
CREATE TRIGGER customer_updated_webhook
AFTER UPDATE ON public.counterparties
FOR EACH ROW WHEN (NEW.type = 'cliente')
EXECUTE FUNCTION public.trigger_webhook_event('cliente.atualizado');

-- Create triggers for fiscal_documents (NFe)
DROP TRIGGER IF EXISTS nfe_emitida_webhook ON public.fiscal_documents;
CREATE TRIGGER nfe_emitida_webhook
AFTER UPDATE ON public.fiscal_documents
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'autorizada' AND NEW.status = 'autorizada')
EXECUTE FUNCTION public.trigger_webhook_event('nfe.emitida');

DROP TRIGGER IF EXISTS nfe_cancelada_webhook ON public.fiscal_documents;
CREATE TRIGGER nfe_cancelada_webhook
AFTER UPDATE ON public.fiscal_documents
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'cancelada' AND NEW.status = 'cancelada')
EXECUTE FUNCTION public.trigger_webhook_event('nfe.cancelada');