import { useMemo } from 'react';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

interface DuplicateResult {
  duplicates: any[];
  potentialDuplicates: any[];
  confidence: number;
}

interface NormalizationResult {
  normalized: any;
  changesApplied: NormalizationChange[];
}

interface NormalizationChange {
  field: string;
  originalValue: any;
  newValue: any;
  reason: string;
}

export const useDataValidation = (data: any) => {
  return useMemo(() => ({
    validateIntegrity: (): ValidationResult => {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      
      // Basic validation checks
      if (data === null || data === undefined) {
        errors.push({
          field: 'data',
          message: 'Dados não fornecidos',
          code: 'MISSING_DATA'
        });
      }
      
      if (Array.isArray(data) && data.length === 0) {
        warnings.push({
          field: 'data',
          message: 'Array de dados está vazio',
          suggestion: 'Verifique a fonte dos dados'
        });
      }
      
      return { 
        isValid: errors.length === 0, 
        errors, 
        warnings 
      };
    },

    detectDuplicates: (): DuplicateResult => {
      const duplicates: any[] = [];
      const potentialDuplicates: any[] = [];
      
      if (Array.isArray(data)) {
        const seen = new Map<string, any>();
        
        data.forEach((item, index) => {
          const key = JSON.stringify(item);
          if (seen.has(key)) {
            duplicates.push({ original: seen.get(key), duplicate: { ...item, index } });
          } else {
            seen.set(key, { ...item, index });
          }
        });
      }
      
      return { 
        duplicates, 
        potentialDuplicates, 
        confidence: 0.95 
      };
    },

    normalizeData: (): NormalizationResult => {
      const changesApplied: NormalizationChange[] = [];
      let normalized = data;
      
      // Normalize null/undefined values
      if (data === null || data === undefined) {
        normalized = {};
        changesApplied.push({
          field: 'root',
          originalValue: data,
          newValue: {},
          reason: 'Converted null/undefined to empty object'
        });
      }
      
      return { 
        normalized, 
        changesApplied 
      };
    }
  }), [data]);
};
