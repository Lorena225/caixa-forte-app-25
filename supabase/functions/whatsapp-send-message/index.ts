import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { decision_id, action_result_id, type, phone, message } = await req.json();

    let messageText = message;
    let targetPhone = phone;
    let companyId: string = '';

    if (decision_id) {
      // Get decision context
      const { data: decision } = await supabase
        .from('ai_decisions')
        .select(`
          *,
          whatsapp_inbox!inner(phone, company_id),
          ai_action_results(executed_actions_json, created_ids_json)
        `)
        .eq('id', decision_id)
        .single();

      if (!decision) {
        throw new Error('Decision not found');
      }

      targetPhone = decision.whatsapp_inbox.phone;
      companyId = decision.whatsapp_inbox.company_id;

      if (type === 'execution_result') {
        const result = decision.ai_action_results?.[0];
        const actions = result?.executed_actions_json || [];
        
        if (actions.length === 0) {
          messageText = '❌ Não foi possível executar a ação. Por favor, tente novamente.';
        } else {
          const successActions = actions.filter((a: any) => a.status !== 'error');
          
          if (successActions.length > 0) {
            const lines = ['✅ *Ação executada com sucesso!*\n'];
            
            for (const action of successActions) {
              if (action.type === 'create_transaction' || action.type === 'create_and_settle') {
                const direction = action.direction === 'inflow' ? '📥 Receita' : '📤 Despesa';
                const status = action.status === 'paid' ? ' (Pago)' : ' (Em aberto)';
                lines.push(`${direction}: R$ ${action.amount?.toFixed(2)}${status}`);
              } else if (action.type === 'settle_transaction') {
                lines.push(`💰 Título baixado: R$ ${action.amount?.toFixed(2)}`);
              }
            }

            lines.push('\n_Envie "DESFAZER" para reverter_');
            messageText = lines.join('\n');
          } else {
            const errors = actions.filter((a: any) => a.status === 'error');
            messageText = `❌ Erro ao executar:\n${errors.map((e: any) => e.error || e.message).join('\n')}`;
          }
        }
      } else if (type === 'confirmation_request') {
        if (decision.ambiguous_matches_json?.length > 0) {
          const options = decision.ambiguous_matches_json;
          const lines = ['🔎 *Encontrei múltiplos títulos:*\n'];
          
          for (const opt of options) {
            lines.push(`*${opt.option}* - R$ ${opt.amount?.toFixed(2)} | ${opt.description?.substring(0, 30)} | Venc: ${opt.due_date}`);
          }
          
          lines.push('\n_Responda com o número da opção (1, 2, 3...)_');
          messageText = lines.join('\n');
        } else if (decision.missing_fields_json?.length > 0) {
          const fields = decision.missing_fields_json;
          const fieldNames: Record<string, string> = {
            category_id: 'Categoria',
            account_id: 'Conta',
            wallet_id: 'Carteira',
            counterparty_id: 'Fornecedor/Cliente',
            amount: 'Valor',
            due_date: 'Data de vencimento',
          };
          
          messageText = `⚠️ *Faltam informações:*\n\n${fields.map((f: string) => `- ${fieldNames[f] || f}`).join('\n')}\n\n_Por favor, forneça os dados faltantes._`;
        } else {
          const action = decision.proposed_actions_json?.[0];
          const amount = action?.transaction?.amount || action?.amount;
          messageText = `🔐 *Confirma a operação?*\n\nValor: R$ ${amount?.toFixed(2)}\n\nResponda:\n*1* - Confirmar\n*2* - Cancelar`;
        }
      } else if (type === 'rollback_success') {
        messageText = '↩️ *Ação desfeita com sucesso!*';
      }
    }

    if (!targetPhone || !messageText) {
      throw new Error('Missing phone or message');
    }

    // Get WhatsApp connection for this company
    const { data: connection } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('company_id', companyId!)
      .eq('status', 'active')
      .single();

    if (!connection) {
      console.log('No active WhatsApp connection found');
      // Still save the outbound message for reference
      await supabase.from('whatsapp_inbox').insert({
        company_id: companyId,
        phone: targetPhone,
        msg_type: 'text',
        text_body: messageText,
        direction: 'outbound',
        status: 'failed',
      });
      
      return new Response(
        JSON.stringify({ success: false, error: 'No active WhatsApp connection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send message based on provider
    let sendResult;
    const credentials = connection.credentials_encrypted ? JSON.parse(connection.credentials_encrypted) : {};

    if (connection.provider === 'twilio') {
      const accountSid = credentials.account_sid;
      const authToken = credentials.auth_token;
      const fromNumber = connection.phone_number;

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `whatsapp:${targetPhone.startsWith('+') ? targetPhone : '+' + targetPhone}`,
            From: `whatsapp:${fromNumber}`,
            Body: messageText,
          }),
        }
      );

      sendResult = await response.json();
    } else if (connection.provider === 'whatsapp_cloud') {
      const accessToken = credentials.access_token;
      const phoneNumberId = credentials.phone_number_id;

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: targetPhone.replace(/\D/g, ''),
            type: 'text',
            text: { body: messageText },
          }),
        }
      );

      sendResult = await response.json();
    } else if (connection.provider === 'evolution') {
      const apiUrl = credentials.api_url;
      const apiKey = credentials.api_key;
      const instance = credentials.instance;

      const response = await fetch(
        `${apiUrl}/message/sendText/${instance}`,
        {
          method: 'POST',
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: targetPhone.replace(/\D/g, ''),
            text: messageText,
          }),
        }
      );

      sendResult = await response.json();
    }

    // Save outbound message
    await supabase.from('whatsapp_inbox').insert({
      company_id: companyId,
      connection_id: connection.id,
      phone: targetPhone,
      msg_type: 'text',
      text_body: messageText,
      direction: 'outbound',
      status: sendResult?.error ? 'failed' : 'replied',
      raw_json: sendResult,
    });

    console.log(`Message sent to ${targetPhone}`);

    return new Response(
      JSON.stringify({ success: true, result: sendResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Send message error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
