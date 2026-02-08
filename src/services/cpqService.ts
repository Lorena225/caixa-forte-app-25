// CPQ (Configure, Price, Quote) Service
// Handles pricing calculations, discount validation, and quote generation

import type { TaxBreakdown, QuoteItem } from "@/hooks/useQuoteBuilder";

export interface DiscountValidationResult {
  isValid: boolean;
  requiresApproval: boolean;
  maxAllowedDiscount: number;
  requestedDiscount: number;
  message?: string;
}

export interface QuoteTotals {
  subtotal: number;
  totalDiscount: number;
  totalTaxes: number;
  totalWithTaxes: number;
  icmsTotal: number;
  icmsStTotal: number;
  ipiTotal: number;
  pisTotal: number;
  cofinsTotal: number;
}

/**
 * Calculate the total for a single quote item
 */
export function calculateItemTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
  taxes?: TaxBreakdown
): { baseValue: number; discountAmount: number; total: number } {
  const grossValue = quantity * unitPrice;
  const discountAmount = grossValue * (discountPercent / 100);
  const baseValue = grossValue - discountAmount;
  
  // If taxes exist, add IPI and ICMS-ST to the total (these are added to price)
  const taxAdditions = taxes ? (taxes.ipi || 0) + (taxes.icms_st || 0) : 0;
  const total = baseValue + taxAdditions;

  return { baseValue, discountAmount, total };
}

/**
 * Calculate totals for all quote items
 */
export function calculateQuoteTotal(items: QuoteItem[]): QuoteTotals {
  let subtotal = 0;
  let totalDiscount = 0;
  let icmsTotal = 0;
  let icmsStTotal = 0;
  let ipiTotal = 0;
  let pisTotal = 0;
  let cofinsTotal = 0;

  items.forEach((item) => {
    const grossValue = item.quantity * item.unit_price;
    const discountAmount = grossValue * ((item.discount_percent || 0) / 100);
    
    subtotal += grossValue - discountAmount;
    totalDiscount += discountAmount;

    if (item.taxes) {
      icmsTotal += item.taxes.icms || 0;
      icmsStTotal += item.taxes.icms_st || 0;
      ipiTotal += item.taxes.ipi || 0;
      pisTotal += item.taxes.pis || 0;
      cofinsTotal += item.taxes.cofins || 0;
    }
  });

  // IPI and ICMS-ST are added to the total (not included in subtotal)
  const totalTaxes = ipiTotal + icmsStTotal;
  const totalWithTaxes = subtotal + totalTaxes;

  return {
    subtotal,
    totalDiscount,
    totalTaxes,
    totalWithTaxes,
    icmsTotal,
    icmsStTotal,
    ipiTotal,
    pisTotal,
    cofinsTotal,
  };
}

/**
 * Validate discount against seller's maximum allowed discount
 */
export function validateDiscount(
  requestedDiscountPercent: number,
  maxAllowedDiscountPercent: number = 10
): DiscountValidationResult {
  const isValid = requestedDiscountPercent <= maxAllowedDiscountPercent;
  const requiresApproval = requestedDiscountPercent > maxAllowedDiscountPercent;

  return {
    isValid,
    requiresApproval,
    maxAllowedDiscount: maxAllowedDiscountPercent,
    requestedDiscount: requestedDiscountPercent,
    message: requiresApproval
      ? `Desconto de ${requestedDiscountPercent.toFixed(1)}% excede o limite de ${maxAllowedDiscountPercent.toFixed(1)}%. Aprovação necessária.`
      : undefined,
  };
}

/**
 * Calculate weighted pipeline value
 */
export function calculateWeightedValue(amount: number, probability: number): number {
  return amount * (probability / 100);
}

/**
 * Format currency in Brazilian Real
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Calculate commission amount based on sale value and commission rate
 */
export function calculateCommission(
  saleAmount: number,
  commissionPercent: number,
  bonusAmount: number = 0
): { commissionAmount: number; totalAmount: number } {
  const commissionAmount = saleAmount * (commissionPercent / 100);
  const totalAmount = commissionAmount + bonusAmount;
  return { commissionAmount, totalAmount };
}

/**
 * Determine if an opportunity is "rotting" (stale)
 */
export function isOpportunityRotting(
  lastActivityDate: string | null | undefined,
  rottingDays: number = 7
): boolean {
  if (!lastActivityDate) return true;

  const lastActivity = new Date(lastActivityDate);
  const now = new Date();
  const diffTime = now.getTime() - lastActivity.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > rottingDays;
}

/**
 * Calculate days until expected close
 */
export function daysUntilClose(expectedCloseDate: string | null | undefined): number | null {
  if (!expectedCloseDate) return null;

  const closeDate = new Date(expectedCloseDate);
  const now = new Date();
  const diffTime = closeDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get urgency level based on days until close
 */
export function getCloseUrgency(
  expectedCloseDate: string | null | undefined
): "overdue" | "urgent" | "soon" | "normal" | null {
  const days = daysUntilClose(expectedCloseDate);
  if (days === null) return null;

  if (days < 0) return "overdue";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "normal";
}
