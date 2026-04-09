import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TimeDailySummary } from '@/hooks/hcm/useTimeTracking';

// Apenas o CLIENT_ID fica no frontend — o CLIENT_SECRET fica na edge function google-oauth-exchange
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // unix ms
  email?: string;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: string; // ISO date or datetime
  end: string;
  colorId?: string;
}

function getRedirectUri() {
  // Em produção usa a URL configurada, em dev usa localhost
  const appUrl = import.meta.env.VITE_APP_URL as string | undefined;
  return `${appUrl || window.location.origin}/google-callback`;
}

// ----------------------------------------------------------------
// OAuth URL
// ----------------------------------------------------------------
export function buildGoogleAuthUrl(state?: string): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID não configurado no .env');
  }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: state || 'google_integration',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ----------------------------------------------------------------
// Token storage (localStorage por simplicidade — swap para Supabase se quiser persistir)
// ----------------------------------------------------------------
const TOKEN_KEY = 'google_tokens';

export function saveGoogleTokens(tokens: GoogleTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function loadGoogleTokens(): GoogleTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearGoogleTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenValid(tokens: GoogleTokens | null): boolean {
  if (!tokens) return false;
  return Date.now() < tokens.expires_at - 60_000; // 1 min de margem
}

// ----------------------------------------------------------------
// Hook principal
// ----------------------------------------------------------------
export function useGoogleIntegration() {
  const { currentCompany } = useAuth();
  const [tokens, setTokens] = useState<GoogleTokens | null>(() => loadGoogleTokens());
  const [loading, setLoading] = useState(false);

  const connected = isTokenValid(tokens);

  // Atualiza quando localStorage muda (ex: callback page)
  useEffect(() => {
    const handler = () => setTokens(loadGoogleTokens());
    window.addEventListener('storage', handler);
    window.addEventListener('google_tokens_updated', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('google_tokens_updated', handler);
    };
  }, []);

  const connect = useCallback(() => {
    try {
      const url = buildGoogleAuthUrl();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao conectar Google');
    }
  }, []);

  const disconnect = useCallback(() => {
    clearGoogleTokens();
    setTokens(null);
    toast.success('Google desconectado');
  }, []);

  // ----------------------------------------------------------------
  // Google Sheets — sync ponto
  // ----------------------------------------------------------------
  const syncPontoToSheets = useCallback(async (
    spreadsheetId: string,
    employeeName: string,
    records: TimeDailySummary[]
  ) => {
    if (!tokens?.access_token) {
      toast.error('Conecte sua conta Google primeiro');
      return;
    }
    setLoading(true);
    try {
      const sheetTitle = employeeName.substring(0, 30);

      // Verifica/cria aba
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (!metaRes.ok) throw new Error('Planilha não encontrada. Verifique o ID.');
      const meta = await metaRes.json();
      const sheetExists = meta.sheets?.some((s: { properties: { title: string } }) => s.properties.title === sheetTitle);

      if (!sheetExists) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetTitle } } }] }),
        });
      }

      // Monta valores
      const header = ['Data', 'Dia', 'Entrada', 'Saída Almoço', 'Retorno', 'Saída', 'Trabalhadas (h)', 'Banco (h)', 'Tipo'];
      const rows = records.map(r => {
        const d = new Date(r.work_date + 'T12:00:00');
        return [
          r.work_date,
          ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()],
          r.entry_1?.slice(0, 5) || '',
          r.exit_1?.slice(0, 5) || '',
          r.entry_2?.slice(0, 5) || '',
          r.exit_2?.slice(0, 5) || '',
          r.worked_hours.toFixed(2),
          r.bank_hours.toFixed(2),
          r.is_weekend ? 'Fim de semana' : r.absence_type || 'Normal',
        ];
      });

      const values = [header, ...rows];
      const range = `${sheetTitle}!A1`;

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
        }
      );

      toast.success(`Ponto sincronizado com Google Sheets (${records.length} registros)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao sincronizar com Sheets');
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  // ----------------------------------------------------------------
  // Google Calendar — criar/atualizar evento
  // ----------------------------------------------------------------
  const upsertCalendarEvent = useCallback(async (
    calendarId: string = 'primary',
    event: GoogleCalendarEvent
  ): Promise<string | null> => {
    if (!tokens?.access_token) {
      toast.error('Conecte sua conta Google primeiro');
      return null;
    }
    try {
      const body = {
        summary: event.summary,
        description: event.description,
        start: event.start.includes('T')
          ? { dateTime: event.start, timeZone: 'America/Sao_Paulo' }
          : { date: event.start },
        end: event.end.includes('T')
          ? { dateTime: event.end, timeZone: 'America/Sao_Paulo' }
          : { date: event.end },
        colorId: event.colorId,
      };

      let res;
      if (event.id) {
        res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
      } else {
        res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Erro ao criar evento');
      }
      const created = await res.json();
      return created.id;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar evento no Calendar');
      return null;
    }
  }, [tokens]);

  const deleteCalendarEvent = useCallback(async (calendarId: string = 'primary', eventId: string) => {
    if (!tokens?.access_token) return;
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
  }, [tokens]);

  const listCalendarEvents = useCallback(async (
    calendarId: string = 'primary',
    timeMin: string,
    timeMax: string
  ): Promise<GoogleCalendarEvent[]> => {
    if (!tokens?.access_token) return [];
    try {
      const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime' });
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((e: {
        id: string; summary: string; description?: string;
        start: { date?: string; dateTime?: string };
        end: { date?: string; dateTime?: string };
        colorId?: string;
      }) => ({
        id: e.id,
        summary: e.summary,
        description: e.description,
        start: e.start.dateTime || e.start.date || '',
        end: e.end.dateTime || e.end.date || '',
        colorId: e.colorId,
      }));
    } catch {
      return [];
    }
  }, [tokens]);

  return {
    connected,
    tokens,
    loading,
    connect,
    disconnect,
    syncPontoToSheets,
    upsertCalendarEvent,
    deleteCalendarEvent,
    listCalendarEvents,
  };
}
