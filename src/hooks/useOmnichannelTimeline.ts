import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TimelineItem {
  id: string;
  type: "activity" | "email" | "whatsapp" | "note" | "call" | "meeting" | "system" | "quote";
  channel: string;
  subject: string;
  content?: string;
  timestamp: string;
  user_name?: string;
  is_outbound?: boolean;
  metadata?: Record<string, unknown>;
}

export function useOmnichannelTimeline(opportunityId?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["omnichannel_timeline", currentCompany?.id, opportunityId],
    queryFn: async (): Promise<TimelineItem[]> => {
      if (!currentCompany?.id || !opportunityId) return [];

      const timeline: TimelineItem[] = [];

      // 1. Fetch CRM Activities
      const { data: activitiesData } = await supabase
        .from("crm_activities")
        .select("id, activity_type, subject, description, created_at, completed_at, is_completed, owner_id")
        .eq("company_id", currentCompany.id)
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });

      const activities = activitiesData as {
        id: string;
        activity_type: string;
        subject: string;
        description: string | null;
        created_at: string;
        completed_at: string | null;
        is_completed: boolean;
        owner_id: string | null;
      }[] | null;

      (activities || []).forEach((activity) => {
        timeline.push({
          id: `activity-${activity.id}`,
          type: activity.activity_type as TimelineItem["type"],
          channel: getChannelFromType(activity.activity_type),
          subject: activity.subject,
          content: activity.description || undefined,
          timestamp: activity.completed_at || activity.created_at,
          metadata: { is_completed: activity.is_completed },
        });
      });

      // 2. Fetch Quotes
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("id, quote_number, title, status, total_amount, created_at")
        .eq("company_id", currentCompany.id)
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });

      const quotes = quotesData as {
        id: string;
        quote_number: string;
        title: string | null;
        status: string;
        total_amount: number;
        created_at: string;
      }[] | null;

      (quotes || []).forEach((quote) => {
        timeline.push({
          id: `quote-${quote.id}`,
          type: "quote",
          channel: "system",
          subject: `Proposta ${quote.quote_number}`,
          content: quote.title || `Valor: R$ ${(quote.total_amount || 0).toLocaleString("pt-BR")}`,
          timestamp: quote.created_at,
          metadata: { status: quote.status, total_amount: quote.total_amount },
        });
      });

      // Sort by timestamp (newest first)
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return timeline;
    },
    enabled: !!currentCompany?.id && !!opportunityId,
    staleTime: 1000 * 30,
  });
}

function getChannelFromType(activityType: string): string {
  switch (activityType) {
    case "call": return "phone";
    case "email": return "email";
    case "whatsapp": return "whatsapp";
    case "meeting": return "meeting";
    case "note": return "note";
    default: return "system";
  }
}
