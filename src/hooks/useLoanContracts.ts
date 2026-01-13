import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  LoanContract, 
  LoanInstallment, 
  LoanContractFormData,
  GenerateAPParams 
} from '@/types/loans';
import { calculateInstallments } from '@/lib/loanCalculations';
import { 
  validateLoanFormData, 
  canCalculateInstallments, 
  canGenerateAPTitles, 
  canActivateContract,
  LOAN_ERROR_MESSAGES,
  formatValidationErrors 
} from './useLoanValidation';

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
          bank_account:bank_accounts!company_bank_account_id(id, account_number, agency)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
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
          bank_account:bank_accounts!company_bank_account_id(id, account_number, agency)
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

// Create loan contract with validation
export function useCreateLoanContract() {
  const { currentCompany, user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: LoanContractFormData) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Validate form data
      const errors = validateLoanFormData(formData);
      if (Object.keys(errors).length > 0) {
        throw new Error(formatValidationErrors(errors));
      }
      
      const { data, error } = await supabase
        .from('loan_contracts')
        .insert({
          company_id: currentCompany.id,
          ...formData,
          status: 'EDICAO',
          currency: 'BRL',
          allow_recalculate: true,
          needs_recalc: false,
          has_generated_titles: false,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('Já existe um contrato com este número. Use outro número.');
        }
        throw error;
      }
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

// Update loan contract with validation
export function useUpdateLoanContract() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...formData }: Partial<LoanContractFormData> & { id: string }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Validate form data
      const errors = validateLoanFormData(formData as Partial<LoanContractFormData>);
      if (Object.keys(errors).length > 0) {
        throw new Error(formatValidationErrors(errors));
      }
      
      const { data, error } = await supabase
        .from('loan_contracts')
        .update(formData)
        .eq('id', id)
        .eq('company_id', currentCompany.id)
        .select()
        .single();
      
      if (error) {
        // Handle database-level validation errors
        if (error.message.includes('Não é possível alterar')) {
          throw new Error(error.message);
        }
        throw error;
      }
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

// Calculate and save installments with validation
export function useCalculateInstallments() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contract: LoanContract) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Validate contract can be calculated
      const checkResult = canCalculateInstallments(contract);
      if (!checkResult.canCalculate) {
        throw new Error(checkResult.reason);
      }
      
      // Validate required fields
      if (!contract.principal_amount || contract.principal_amount <= 0) {
        throw new Error(LOAN_ERROR_MESSAGES.PRINCIPAL_POSITIVE);
      }
      if (!contract.installments_count || contract.installments_count <= 0) {
        throw new Error(LOAN_ERROR_MESSAGES.INSTALLMENTS_POSITIVE);
      }
      if (contract.grace_periods > contract.installments_count) {
        throw new Error(LOAN_ERROR_MESSAGES.GRACE_EXCEEDS_INSTALLMENTS);
      }
      
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
      
      // Delete existing PREVISTA installments (not generated ones)
      const { error: deleteError } = await supabase
        .from('loan_installments')
        .delete()
        .eq('contract_id', contract.id)
        .eq('company_id', currentCompany.id)
        .eq('status', 'PREVISTA')
        .is('ap_transaction_id', null);
      
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
        params_json: { 
          installments_count: calculated.length,
          principal: contract.principal_amount,
          rate: contract.nominal_rate,
          system: contract.amortization_system,
        },
        status: 'OK',
      });
      
      return calculated;
    },
    onSuccess: (_, contract) => {
      queryClient.invalidateQueries({ queryKey: ['loan-installments', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['loan-contract', contract.id] });
      toast.success('Parcelas calculadas com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao calcular parcelas: ${error.message}`);
    },
  });
}

// Generate AP titles from installments with validation
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
      
      // Validate contract state
      if ((contract as any).needs_recalc) {
        throw new Error(LOAN_ERROR_MESSAGES.NEEDS_RECALC);
      }
      
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
        throw new Error(LOAN_ERROR_MESSAGES.NO_INSTALLMENTS_TO_GENERATE);
      }
      
      // Generate idempotency key
      const idempotencyKey = `APGEN:${contract_id}:${max_installment || 'all'}:${max_date || 'all'}:${Date.now()}`;
      
      const bankName = (contract.bank as any)?.name || 'Banco';
      const walletId = (contract.company_bank_account as any)?.wallet_id;
      
      if (!walletId) {
        throw new Error(LOAN_ERROR_MESSAGES.WALLET_REQUIRED);
      }
      
      const accountId = contract.liability_account_id;
      if (!accountId) {
        throw new Error(LOAN_ERROR_MESSAGES.LIABILITY_ACCOUNT_REQUIRED);
      }
      
      const createdTransactions: string[] = [];
      const skippedInstallments: number[] = [];
      
      // Create AP transactions for each installment
      for (const installment of installments) {
        // Double-check idempotency at installment level
        if (installment.ap_transaction_id) {
          skippedInstallments.push(installment.installment_no);
          continue;
        }
        
        // Build description from template
        let description = contract.description_template || 
          'Empréstimo {bank} – Contrato {contract} – Parcela {k}/{n}';
        
        description = description
          .replace('{bank}', bankName)
          .replace('{contract}', contract.contract_number)
          .replace('{k}', String(installment.installment_no))
          .replace('{n}', String(contract.installments_count));
        
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
          skipped_count: skippedInstallments.length,
          transaction_ids: createdTransactions,
        },
        status: 'OK',
        created_by: user?.id,
      });
      
      return { 
        count: createdTransactions.length, 
        skipped: skippedInstallments.length,
        transactionIds: createdTransactions 
      };
    },
    onSuccess: (result, params) => {
      queryClient.invalidateQueries({ queryKey: ['loan-installments', params.contract_id] });
      queryClient.invalidateQueries({ queryKey: ['loan-contract', params.contract_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      let message = `${result.count} título(s) AP gerado(s) com sucesso`;
      if (result.skipped > 0) {
        message += `. ${result.skipped} já estava(m) gerado(s).`;
      }
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar lançamentos: ${error.message}`);
    },
  });
}

// Activate contract with validation
export function useActivateLoanContract() {
  const { currentCompany, user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contractId: string) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Fetch contract to validate
      const { data: contract, error: fetchError } = await supabase
        .from('loan_contracts')
        .select('*')
        .eq('id', contractId)
        .eq('company_id', currentCompany.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Check if has installments
      const { data: installments, error: checkError } = await supabase
        .from('loan_installments')
        .select('id')
        .eq('contract_id', contractId)
        .eq('company_id', currentCompany.id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      const hasInstallments = installments && installments.length > 0;
      
      // Validate contract can be activated
      const checkResult = canActivateContract(contract as any, hasInstallments);
      if (!checkResult.canActivate) {
        throw new Error(checkResult.reason);
      }
      
      const { error } = await supabase
        .from('loan_contracts')
        .update({ 
          status: 'ATIVO', 
          allow_recalculate: false,
          activated_at: new Date().toISOString(),
          activated_by: user?.id,
        })
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
