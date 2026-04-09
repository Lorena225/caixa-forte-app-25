import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CLICKSIGN_BASE = 'https://app.clicksign.com/api/v1'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const CLICKSIGN_TOKEN = Deno.env.get('CLICKSIGN_ACCESS_TOKEN')
    if (!CLICKSIGN_TOKEN) {
      return new Response(JSON.stringify({ error: 'CLICKSIGN_ACCESS_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, payload } = await req.json()

    let url = ''
    let method = 'GET'
    let body: string | undefined

    switch (action) {
      // ---- Criar documento (upload via URL de um PDF já hospedado) ----
      case 'create_document': {
        url = `${CLICKSIGN_BASE}/documents?access_token=${CLICKSIGN_TOKEN}`
        method = 'POST'
        body = JSON.stringify({
          document: {
            path: payload.path,               // ex: /Contratos/CTR-00001.pdf
            content_base64: payload.content_base64, // base64 do PDF
            deadline_at: payload.deadline_at,  // ISO date
            auto_close: payload.auto_close ?? true,
            locale: 'pt-BR',
            sequence_enabled: false,
            remind_interval: 3,
          }
        })
        break
      }

      // ---- Adicionar signatário ----
      case 'add_signer': {
        url = `${CLICKSIGN_BASE}/signers?access_token=${CLICKSIGN_TOKEN}`
        method = 'POST'
        body = JSON.stringify({
          signer: {
            email: payload.email,
            phone_number: payload.phone_number,
            name: payload.name,
            has_documentation: payload.cpf ? true : false,
            documentation: payload.cpf,
            birthday: payload.birthday,
            auth: payload.auth || 'email', // 'email' | 'sms' | 'whatsapp'
          }
        })
        break
      }

      // ---- Vincular signatário ao documento ----
      case 'add_signer_to_document': {
        url = `${CLICKSIGN_BASE}/lists?access_token=${CLICKSIGN_TOKEN}`
        method = 'POST'
        body = JSON.stringify({
          list: {
            document_key: payload.document_key,
            signer_key: payload.signer_key,
            sign_as: payload.sign_as || 'sign', // 'sign' | 'approve' | 'witness' | 'contractor' | 'contractee'
            message: payload.message,
          }
        })
        break
      }

      // ---- Fechar documento para assinatura (notifica signatários) ----
      case 'close_document': {
        url = `${CLICKSIGN_BASE}/documents/${payload.document_key}/close?access_token=${CLICKSIGN_TOKEN}`
        method = 'PATCH'
        body = JSON.stringify({ status: 'closed' })
        break
      }

      // ---- Buscar status do documento ----
      case 'get_document': {
        url = `${CLICKSIGN_BASE}/documents/${payload.document_key}?access_token=${CLICKSIGN_TOKEN}`
        method = 'GET'
        break
      }

      // ---- Cancelar documento ----
      case 'cancel_document': {
        url = `${CLICKSIGN_BASE}/documents/${payload.document_key}/cancel?access_token=${CLICKSIGN_TOKEN}`
        method = 'PATCH'
        body = JSON.stringify({ status: 'canceled' })
        break
      }

      // ---- Gerar link de assinatura (widget embed) ----
      case 'get_sign_link': {
        url = `${CLICKSIGN_BASE}/sign_url?access_token=${CLICKSIGN_TOKEN}`
        method = 'POST'
        body = JSON.stringify({
          request_signature_key: payload.request_signature_key,
          redirect_to: payload.redirect_to,
        })
        break
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
