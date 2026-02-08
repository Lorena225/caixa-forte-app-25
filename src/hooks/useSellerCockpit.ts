import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SellerCockpitData {
  seller: {
    id: string;
    name: string;
    code: string;
    hierarchy_level?: string;
    max_discount_percent?: number;
  } | null;
  currentGoal: {
    target: number;
    achieved: number;
    percent: number;
    gap: number;
  };
  upcomingTasks: {
    id: string;
    subject: string;
    scheduled_at: string;
    opportunity_title?: string;
    activity_type: string;
  }[];
  hotOpportunities: {
    id: string;
    title: string;
    amount: number;
    probability: number;
    expected_close_date?: string;
    stage_name?: string;
    days_in_stage?: number;
  }[];
  pipelineSummary: {
    stage_id: string;
    stage_name: string;
    stage_color: string;
    count: number;
    total: number;
    weighted_total: number;
    probability: number;
  }[];
  recentWins: {
    id: string;
    title: string;
    amount: number;
    closed_at: string;
  }[];
  performance: {
    total_opportunities: number;
    won_count: number;
    lost_count: number;
    win_rate: number;
    avg_deal_size: number;
    avg_sales_cycle_days: number;
  };
}

export function useSellerCockpit() {
  const { currentCompany, user } = useAuth();

  return useQuery({
    queryKey: ["seller_cockpit", currentCompany?.id, user?.id],
    queryFn: async (): Promise<SellerCockpitData> => {
      if (!currentCompany?.id || !user?.id) {
        return getEmptyData();
      }

      // Get seller info
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, name, code, hierarchy_level, max_discount_percent")
        .eq("company_id", currentCompany.id)
        .eq("user_id", user.id)
        .single();

      if (!seller) {
        return getEmptyData();
      }

      // Get current month goal
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const { data: goalData } = await supabase
        .from("sales_goals")
        .select("target_amount, achieved_amount")
        .eq("company_id", currentCompany.id)
        .eq("seller_id", seller.id)
        .eq("period_year", currentYear)
        .eq("period_month", currentMonth)
        .single();

      const target = goalData?.target_amount || 0;
      const achieved = goalData?.achieved_amount || 0;
      const percent = target > 0 ? (achieved / target) * 100 : 0;
      const gap = Math.max(0, target - achieved);

      // Get upcoming tasks (activities scheduled for the future)
      const { data: tasks } = await supabase
        .from("crm_activities")
        .select(`
          id,
          subject,
          scheduled_at,
          activity_type,
          opportunity:opportunities(title)
        `)
        .eq("company_id", currentCompany.id)
        .eq("seller_id", seller.id)
        .eq("is_completed", false)
        .not("scheduled_at", "is", null)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(10);

      // Get hot opportunities (open, high value, close to expected close date)
      const { data: hotOpps } = await supabase
        .from("opportunities")
        .select(`
          id,
          title,
          amount,
          probability,
          expected_close_date,
          created_at,
          stage:pipeline_stages(name, color)
        `)
        .eq("company_id", currentCompany.id)
        .eq("seller_id", seller.id)
        .eq("status", "open")
        .order("amount", { ascending: false })
        .limit(5);

      // Get pipeline summary grouped by stage
      const { data: allOpps } = await supabase
        .from("opportunities")
        .select(`
          id,
          amount,
          probability,
          stage_id,
          stage:pipeline_stages(id, name, color, probability)
        `)
        .eq("company_id", currentCompany.id)
        .eq("seller_id", seller.id)
        .eq("status", "open");

      const stageMap = new Map<string, {
        stage_id: string;
        stage_name: string;
        stage_color: string;
        probability: number;
        count: number;
        total: number;
        weighted_total: number;
      }>();

      (allOpps || []).forEach((opp) => {
        const stageId = opp.stage_id;
        const stage = opp.stage as { id: string; name: string; color: string; probability: number } | null;
        if (!stageId || !stage) return;

        const existing = stageMap.get(stageId);
        const amount = opp.amount || 0;
        const prob = stage.probability || opp.probability || 50;

        if (existing) {
          existing.count += 1;
          existing.total += amount;
          existing.weighted_total += amount * (prob / 100);
        } else {
          stageMap.set(stageId, {
            stage_id: stageId,
            stage_name: stage.name || "Sem nome",
            stage_color: stage.color || "#3B82F6",
            probability: prob,
            count: 1,
            total: amount,
            weighted_total: amount * (prob / 100),
          });
        }
      });

      const pipelineSummary = Array.from(stageMap.values());

      // Get recent wins (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentWinsData } = await supabase
        .from("opportunities")
        .select("id, title, amount, actual_close_date")
        .eq("company_id", currentCompany.id)
        .eq("seller_id", seller.id)
        .eq("status", "won")
        .gte("actual_close_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("actual_close_date", { ascending: false })
        .limit(5);

      // Get performance metrics
      const { data: performanceData } = await supabase
        .from("opportunities")
        .select("id, status, amount, created_at, actual_close_date")
        .eq("company_id", currentCompany.id)
        .eq("seller_id", seller.id)
        .gte("created_at", new Date(currentYear, 0, 1).toISOString());

      const wonOpps = (performanceData || []).filter((o) => o.status === "won");
      const lostOpps = (performanceData || []).filter((o) => o.status === "lost");
      const closedOpps = wonOpps.length + lostOpps.length;

      // Calculate avg sales cycle for won opportunities
      let totalCycleDays = 0;
      wonOpps.forEach((opp) => {
        if (opp.actual_close_date && opp.created_at) {
          const created = new Date(opp.created_at);
          const closed = new Date(opp.actual_close_date);
          totalCycleDays += Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }
      });

      const performance = {
        total_opportunities: performanceData?.length || 0,
        won_count: wonOpps.length,
        lost_count: lostOpps.length,
        win_rate: closedOpps > 0 ? (wonOpps.length / closedOpps) * 100 : 0,
        avg_deal_size: wonOpps.length > 0 
          ? wonOpps.reduce((sum, o) => sum + (o.amount || 0), 0) / wonOpps.length 
          : 0,
        avg_sales_cycle_days: wonOpps.length > 0 ? totalCycleDays / wonOpps.length : 0,
      };

      return {
        seller: {
          id: seller.id,
          name: seller.name,
          code: seller.code,
          hierarchy_level: seller.hierarchy_level,
          max_discount_percent: seller.max_discount_percent,
        },
        currentGoal: { target, achieved, percent, gap },
        upcomingTasks: (tasks || []).map((t) => ({
          id: t.id,
          subject: t.subject,
          scheduled_at: t.scheduled_at!,
          opportunity_title: (t.opportunity as { title: string } | null)?.title,
          activity_type: t.activity_type,
        })),
        hotOpportunities: (hotOpps || []).map((o) => ({
          id: o.id,
          title: o.title,
          amount: o.amount || 0,
          probability: o.probability || 50,
          expected_close_date: o.expected_close_date,
          stage_name: (o.stage as { name: string } | null)?.name,
        })),
        pipelineSummary,
        recentWins: (recentWinsData || []).map((w) => ({
          id: w.id,
          title: w.title,
          amount: w.amount || 0,
          closed_at: w.actual_close_date!,
        })),
        performance,
      };
    },
    enabled: !!currentCompany?.id && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

function getEmptyData(): SellerCockpitData {
  return {
    seller: null,
    currentGoal: { target: 0, achieved: 0, percent: 0, gap: 0 },
    upcomingTasks: [],
    hotOpportunities: [],
    pipelineSummary: [],
    recentWins: [],
    performance: {
      total_opportunities: 0,
      won_count: 0,
      lost_count: 0,
      win_rate: 0,
      avg_deal_size: 0,
      avg_sales_cycle_days: 0,
    },
  };
}
