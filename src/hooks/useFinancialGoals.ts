import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FinancialGoal {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string;
  icon: string;
  color: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  target_date: string;
  icon?: string;
  color?: string;
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  status?: 'active' | 'completed' | 'cancelled';
}

export function useFinancialGoals() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['financial-goals', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FinancialGoal[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateGoal() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase
        .from('financial_goals')
        .insert({
          company_id: currentCompany.id,
          name: input.name,
          description: input.description || null,
          target_amount: input.target_amount,
          current_amount: input.current_amount || 0,
          target_date: input.target_date,
          icon: input.icon || 'target',
          color: input.color || 'blue',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as FinancialGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
      toast.success('Meta criada com sucesso! 🎯');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar meta', { description: error.message });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateGoalInput & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_goals')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as FinancialGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
      toast.success('Meta atualizada! ✨');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar meta', { description: error.message });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
      toast.success('Meta removida');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover meta', { description: error.message });
    },
  });
}

export function useAddToGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // First get the current amount
      const { data: currentGoal, error: fetchError } = await supabase
        .from('financial_goals')
        .select('current_amount, target_amount')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newAmount = (currentGoal.current_amount || 0) + amount;
      const isCompleted = newAmount >= currentGoal.target_amount;
      
      const { data, error } = await supabase
        .from('financial_goals')
        .update({ 
          current_amount: newAmount,
          status: isCompleted ? 'completed' : 'active',
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as FinancialGoal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
      if (data.status === 'completed') {
        toast.success('🎉 Parabéns! Meta alcançada!', {
          description: `Você atingiu a meta "${data.name}"`,
        });
      } else {
        toast.success('Valor adicionado à meta! 💰');
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar valor', { description: error.message });
    },
  });
}

// Utility function to calculate monthly savings needed
export function calculateMonthlySavings(
  targetAmount: number, 
  currentAmount: number, 
  targetDate: string
): { monthly: number; remaining: number; monthsLeft: number } {
  const remaining = targetAmount - currentAmount;
  const now = new Date();
  const target = new Date(targetDate);
  const monthsLeft = Math.max(1, 
    (target.getFullYear() - now.getFullYear()) * 12 + 
    (target.getMonth() - now.getMonth())
  );
  const monthly = remaining / monthsLeft;
  
  return { monthly, remaining, monthsLeft };
}
