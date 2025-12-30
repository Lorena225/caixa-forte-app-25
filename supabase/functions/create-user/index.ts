// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, fullName, companyName } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // Create company
    const finalCompanyName = companyName || `Empresa de ${fullName}`
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: finalCompanyName })
      .select()
      .single()

    if (companyError) throw companyError

    // Link user to company as admin
    const { error: linkError } = await supabaseAdmin
      .from('company_users')
      .insert({
        user_id: userId,
        company_id: company.id,
        role: 'admin',
        is_default: true
      })

    if (linkError) throw linkError

    return new Response(
      JSON.stringify({ success: true, userId, companyId: company.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
