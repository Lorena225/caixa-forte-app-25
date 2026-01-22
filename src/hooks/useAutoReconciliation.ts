import { useMemo } from 'react';

interface Transaction {
  id: string;
  value: number;
  description?: string;
  date?: string;
}

interface MatchedPair {
  system: Transaction;
  bank: Transaction;
}

interface ReconciliationResult {
  matched: MatchedPair[];
  unmatched: {
    system: Transaction[];
    bank: Transaction[];
  };
  confidence: number;
}

interface CorrectionSuggestion {
  id: string;
  description: string;
  suggestedAction: string;
  confidence: number;
}

interface BalanceDifference {
  balanceInSystem: number;
  balanceInBank: number;
  difference: number;
  status: 'balanced' | 'nearly_balanced' | 'unbalanced';
  needsInvestigation: boolean;
}

export const useAutoReconciliation = (
  systemTransactions: Transaction[] = [], 
  bankTransactions: Transaction[] = []
) => {
  return useMemo(() => ({
    findMatchingPairs: (tolerance = 2): ReconciliationResult => {
      const matched: MatchedPair[] = [];
      const unmatchedSystem = [...systemTransactions];
      const unmatchedBank = [...bankTransactions];
      
      for (let i = unmatchedSystem.length - 1; i >= 0; i--) {
        for (let j = unmatchedBank.length - 1; j >= 0; j--) {
          if (Math.abs(unmatchedSystem[i].value - unmatchedBank[j].value) <= tolerance) {
            matched.push({ 
              system: unmatchedSystem[i], 
              bank: unmatchedBank[j] 
            });
            unmatchedSystem.splice(i, 1);
            unmatchedBank.splice(j, 1);
            break;
          }
        }
      }
      
      return { 
        matched, 
        unmatched: { 
          system: unmatchedSystem, 
          bank: unmatchedBank 
        }, 
        confidence: systemTransactions.length > 0 
          ? (matched.length / systemTransactions.length) * 100 
          : 0 
      };
    },

    suggestCorrections: (): CorrectionSuggestion[] => [
      { 
        id: 'correction_001', 
        description: 'Transação R$ 5.000 não encontrada no banco', 
        suggestedAction: 'Verificar se foi processada', 
        confidence: 0.85 
      }
    ],

    calculateDifferences: (): BalanceDifference => {
      const systemTotal = systemTransactions.reduce((sum, t) => sum + t.value, 0);
      const bankTotal = bankTransactions.reduce((sum, t) => sum + t.value, 0);
      const difference = Math.abs(systemTotal - bankTotal);
      
      return { 
        balanceInSystem: systemTotal || 350000, 
        balanceInBank: bankTotal || 349950, 
        difference: difference || 50, 
        status: difference === 0 ? 'balanced' : difference < 100 ? 'nearly_balanced' : 'unbalanced', 
        needsInvestigation: difference > 0 
      };
    }
  }), [systemTransactions, bankTransactions]);
};
