import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveGoogleTokens } from '@/hooks/useGoogleIntegration';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg('Acesso negado pelo usuário.');
      setTimeout(() => navigate('/integracoes/google'), 3000);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('Código de autorização não encontrado.');
      setTimeout(() => navigate('/integracoes/google'), 3000);
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      setStatus('error');
      setErrorMsg('VITE_GOOGLE_CLIENT_ID não configurado no .env');
      setTimeout(() => navigate('/integracoes/google'), 3000);
      return;
    }

    (async () => {
      try {
        // Troca o código pelo token via Edge Function (client_secret fica no servidor)
        const { data, error: fnError } = await supabase.functions.invoke('google-oauth-exchange', {
          body: {
            code,
            redirect_uri: `${window.location.origin}/google-callback`,
            grant_type: 'authorization_code',
          },
        });

        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || 'Falha ao trocar código por token');
        }

        // Busca email do usuário Google
        let email: string | undefined;
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          const user = await userRes.json();
          email = user.email;
        } catch { /* não crítico */ }

        saveGoogleTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
          email,
        });

        window.dispatchEvent(new Event('google_tokens_updated'));
        setStatus('success');
        setTimeout(() => navigate('/integracoes/google'), 2000);
      } catch (e) {
        setStatus('error');
        setErrorMsg(e instanceof Error ? e.message : 'Erro desconhecido');
        setTimeout(() => navigate('/integracoes/google'), 4000);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <p className="font-medium">Conectando conta Google...</p>
              <p className="text-sm text-muted-foreground">Aguarde, trocando tokens com segurança...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <p className="font-medium text-green-600">Google conectado com sucesso!</p>
              <p className="text-sm text-muted-foreground">Redirecionando...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="font-medium text-destructive">Erro na conexão</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <p className="text-xs text-muted-foreground mt-2">Redirecionando em instantes...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
