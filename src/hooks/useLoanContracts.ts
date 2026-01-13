import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  LoanContract, 
  LoanInstallment, 
  LoanContractFormData,
  CalculatedInstallment,
  GenerateAPParams 
} from '@/types/loans';
import { calculateInstallments } from '@/lib/loanCalculations';

// Fetch all loan contracts for current company
export function useLoanContracts() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['loan-contracts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('loan_contracts')
        .select(`
          *,
          creditor:counterparties!creditor_partner_id(id, name, document),
          bank:banks_reference!bank_id(id, name, compe_code),
          bank_account:bank_accounts!company_bank_account_id(id, account_number, agency_number)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Cast and return
      return (data || []) as unknown as LoanContract[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Fetch single loan contract with installments
export function useLoanContract(contractId: string | undefined) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['loan-contract', contractId],
    queryFn: async () => {
      if (!contractId || !currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('loan_contracts')
        .select(`
          *,
          creditor:counterparties!creditor_partner_id(id, name, document),
          bank:banks_reference!bank_id(id, name, compe_code),
          bank_account:bank_accounts!company_bank_account_id(id, account_number, agency_number)
        `)
        .eq('id', contractId)
        .eq('company_id', currentCompany.id)
        .single();
      
      if (error) throw error;
      
      return data as unknown as LoanContract;
    },
    enabled: !!contractId && !!currentCompany?.id,
  });
}

// Fetch installments for a contract
export function useLoanInstallments(contractId: string | undefined) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['loan-installments', contractId],
    queryFn: async () => {
      if (!contractId || !currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('loan_installments')
        .select('*')
        .eq('contract_id', contractId)
        .eq('company_id', currentCompany.id)
        .order('installment_no', { ascending: true });
      
      if (error) throw error;
      
      return (data || []) as LoanInstallment[];
    },
    enabled: !!contractId && !!currentCompany?.id,
  });
}

// Create loan contract
export function useCreateLoanContract() {
  const { currentCompany, user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: LoanContractFormData) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase
        .from('loan_contracts')
        .insert({
          company_id: currentCompany.id,
          ...formData,
          status: 'EDICAO',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-contracts'] });
      toast.success('Contrato criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar contrato: ${error.message}`);
    },
  });
}

// Update loan contract
export function useUpdateLoanContract() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...formData }: Partial<LoanContractFormData> & { id: string }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase
        .from('loan_contracts')
        .update(formData)
        .eq('id', id)
        .eq('company_id', currentCompany.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loan-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['loan-contract', data.id] });
      toast.success('Contrato atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar contrato: ${error.message}`);
    },
  });
}

// Calculate and save installments
export function useCalculateInstallments() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contract: LoanContract) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Calculate installments
      const calculated = calculateInstallments({
        principal: contract.principal_amount,
        nominalRate: contract.nominal_rate,
        ratePeriod: contract.rate_period,
        installmentsCount: contract.installments_count,
        installmentPeriod: contract.installment_period,
        amortizationSystem: contract.amortization_system,
        gracePeriods: contract.grace_periods,
        graceType: contract.grace_type,
        firstDueDate: new Date(contract.first_due_date),
      });
      
      // Delete existing installments (only PREVISTA status)
      const { error: deleteError } = await supabase
        .from('loan_installments')
        .delete()
        .eq('contract_id', contract.id)
        .eq('company_id', currentCompany.id)
        .eq('status', 'PREVISTA');
      
      if (deleteError) throw deleteError;
      
      // Insert new installments
      const installmentsToInsert = calculated.map((inst) => ({
        company_id: currentCompany.id,
        contract_id: contract.id,
        ...inst,
        status: 'PREVISTA' as const,
      }));
      
      const { error: insertError } = await supabase
        .from('loan_installments')
        .insert(installmentsToInsert);
      
      if (insertError) throw insertError;
      
      // Log the run
      await supabase.from('loan_generation_runs').insert({
        company_id: currentCompany.id,
        contract_id: contract.id,
        run_type: 'CALCULO',
        idempotency_key: `CALC:${contract.id}:${Date.now()}`,
        params_json: { installments_count: calculated.length },
        status: 'OK',
      });
      
      return calculated;
    },
    onSuccess: (_, contract) => {
      queryClient.invalidateQueries({ queryKey: ['loan-installments', contract.id] });
      toast.success('Parcelas calculadas com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao calcular parcelas: ${error.message}`);
    },
  });
}

// Generate AP titles from installments
export function useGenerateAPTitles() {
  const { currentCompany, user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ contract_id, max_installment, max_date }: GenerateAPParams) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Fetch contract with bank account info for wallet_id
      const { data: contract, error: contractError } = await supabase
        .from('loan_contracts')
        .select(`
          *,
          bank:banks_reference!bank_id(name),
          company_bank_account:bank_accounts!company_bank_account_id(wallet_id)
        `)
        .eq('id', contract_id)
        .eq('company_id', currentCompany.id)
        .single();
      
      if (contractError) throw contractError;
      
      // Fetch installments to generate (PREVISTA only, without ap_transaction_id)
      let query = supabase
        .from('loan_installments')
        .select('*')
        .eq('contract_id', contract_id)
        .eq('company_id', currentCompany.id)
        .eq('status', 'PREVISTA')
        .is('ap_transaction_id', null)
        .order('installment_no', { ascending: true });
      
      if (max_installment) {
        query = query.lte('installment_no', max_installment);
      }
      
      if (max_date) {
        query = query.lte('due_date', max_date);
      }
      
      const { data: installments, error: installmentsError } = await query;
      
      if (installmentsError) throw installmentsError;
      if (!installments || installments.length === 0) {
        throw new Error('Não há parcelas pendentes para gerar lançamentos');
      }
      
      // Generate idempotency key
      const idempotencyKey = `APGEN:${contract_id}:${max_installment || 'all'}:${max_date || 'all'}`;
      
      // Check if already run
      const { data: existingRun } = await supabase
        .from('loan_generation_runs')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('idempotency_key', idempotencyKey)
        .single();
      
      if (existingRun) {
        throw new Error('Esta operação já foi executada. Use parâmetros diferentes.');
      }
      
      const bankName = (contract.bank as any)?.name || 'Banco';
      const walletId = (contract.company_bank_account as any)?.wallet_id;
      
      if (!walletId) {
        throw new Error('A conta bancária do contrato não possui carteira (wallet) vinculada');
      }
      
      const createdTransactions: string[] = [];
      
      // Create AP transactions for each installment
      for (const installment of installments) {
        // Build description from template
        let description = contract.description_template || 
          'Empréstimo {bank} – Contrato {contract} – Parcela {k}/{n}';
        
        description = description
          .replace('{bank}', bankName)
          .replace('{contract}', contract.contract_number)
          .replace('{k}', String(installment.installment_no))
          .replace('{n}', String(contract.installments_count));
        
        // Create AP transaction - need to get a default account_id for payables
        // We'll use the liability_account_id from contract if available, or need a default
        const accountId = contract.liability_account_id;
        
        if (!accountId) {
          throw new Error('O contrato precisa de uma conta contábil (liability_account_id) para gerar títulos AP');
        }
        
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            company_id: currentCompany.id,
            account_id: accountId,
            wallet_id: walletId,
            direction: 'saida' as const,
            counterparty_id: contract.creditor_partner_id,
            description,
            original_amount: installment.installment_amount,
            total_amount: installment.installment_amount,
            transaction_date: contract.contract_date,
            due_date: installment.due_date,
            document_number: `${contract.contract_number}-${installment.installment_no}`,
            origin_type: 'CONTRATO_EMPRESTIMO',
            origin_contract_id: contract.id,
            origin_installment_id: installment.id,
            cost_center_id: contract.cost_center_id || null,
          })
          .select('id')
          .single();
        
        if (txError) throw txError;
        
        // Update installment with transaction ID
        const { error: updateError } = await supabase
          .from('loan_installments')
          .update({
            ap_transaction_id: transaction.id,
            status: 'GERADA',
            generated_at: new Date().toISOString(),
          })
          .eq('id', installment.id);
        
        if (updateError) throw updateError;
        
        createdTransactions.push(transaction.id);
      }
      
      // Log the run
      await supabase.from('loan_generation_runs').insert({
        company_id: currentCompany.id,
        contract_id: contract_id,
        run_type: 'GERACAO_AP',
        idempotency_key: idempotencyKey,
        params_json: { 
          max_installment, 
          max_date,
          generated_count: createdTransactions.length,
          transaction_ids: createdTransactions,
        },
        status: 'OK',
        created_by: user?.id,
      });
      
      return { count: createdTransactions.length, transactionIds: createdTransactions };
    },
    onSuccess: (result, params) => {
      queryClient.invalidateQueries({ queryKey: ['loan-installments', params.contract_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${result.count} título(s) AP gerado(s) com sucesso`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar lançamentos: ${error.message}`);
    },
  });
}

// Activate contract
export function useActivateLoanContract() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contractId: string) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Check if has installments
      const { data: installments, error: checkError } = await supabase
        .from('loan_installments')
        .select('id')
        .eq('contract_id', contractId)
        .eq('company_id', currentCompany.id)
        .limit(1);
      
      if (checkError) throw checkError;
      if (!installments || installments.length === 0) {
        throw new Error('Calcule as parcelas antes de ativar o contrato');
      }
      
      const { error } = await supabase
        .from('loan_contracts')
        .update({ status: 'ATIVO', allow_recalculate: false })
        .eq('id', contractId)
        .eq('company_id', currentCompany.id);
      
      if (error) throw error;
    },
    onSuccess: (_, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['loan-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['loan-contract', contractId] });
      toast.success('Contrato ativado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao ativar contrato: ${error.message}`);
    },
  });
}
