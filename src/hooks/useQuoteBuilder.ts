import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  product_id?: string;
  product_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  taxes?: TaxBreakdown;
  total: number;
}

export interface TaxBreakdown {
  base_value: number;
  icms: number;
  icms_rate: number;
  icms_st: number;
  icms_st_rate: number;
  ipi: number;
  ipi_rate: number;
  pis: number;
  pis_rate: number;
  cofins: number;
  cofins_rate: number;
  total: number;
}

export interface Quote {
  id: string;
  company_id: string;
  opportunity_id?: string;
  quote_number: string;
  title?: string;
  status: string;
  approval_status?: string;
  requires_approval?: boolean;
  discount_percent?: number;
  subtotal?: number;
  total_taxes?: number;
  total_with_taxes?: number;
  total_amount: number;
  valid_until?: string;
  notes?: string;
  terms?: string;
  created_at: string;
  updated_at?: string;
}

export interface PriceBookItem {
  id: string;
  price_book_id: string;
  product_id: string;
  unit_price: number;
  min_quantity?: number;
  max_discount_percent?: number;
  product?: {
    id: string;
    name: string;
    code?: string;
    ncm?: string;
  };
}

export function useQuoteBuilder(opportunityId?: string) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [selectedPriceBookId, setSelectedPriceBookId] = useState<string>("");

  // Fetch price books
  const priceBooks = useQuery({
    queryKey: ["price_books", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("price_books")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch price book items
  const priceBookItems = useQuery({
    queryKey: ["price_book_items", selectedPriceBookId],
    queryFn: async () => {
      if (!selectedPriceBookId) return [];
      const { data, error } = await supabase
        .from("price_book_items")
        .select("*, product:products(id, name, code, ncm)")
        .eq("price_book_id", selectedPriceBookId)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as unknown as PriceBookItem[];
    },
    enabled: !!selectedPriceBookId,
  });

  // Fetch opportunity details
  const opportunity = useQuery({
    queryKey: ["opportunity_detail", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return null;
      
      // First get the opportunity
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .select("id, counterparty_id")
        .eq("id", opportunityId)
        .single();
      
      if (oppError) throw oppError;
      
      // Then get the counterparty if exists
      let counterparty: { id: string } | null = null;
      if (opp?.counterparty_id) {
        const { data: cpData } = await supabase
          .from("counterparties")
          .select("id")
          .eq("id", opp.counterparty_id)
          .single();
        if (cpData) {
          counterparty = { id: cpData.id };
        }
      }
      
      return { id: opp.id, counterparty };
    },
    enabled: !!opportunityId,
  });

  // Calculate taxes for an item using the database function
  const calculateItemTaxes = async (
    productId: string,
    quantity: number,
    unitPrice: number,
    counterpartyId?: string
  ): Promise<TaxBreakdown | null> => {
    if (!currentCompany?.id) return null;

    try {
      const { data, error } = await supabase.rpc("calculate_quote_item_taxes", {
        p_product_id: productId,
        p_quantity: quantity,
        p_unit_price: unitPrice,
        p_company_id: currentCompany.id,
        p_counterparty_id: counterpartyId || null,
      });

      if (error) {
        console.error("Tax calculation error:", error);
        return null;
      }

      return data as unknown as TaxBreakdown;
    } catch (err) {
      console.error("Tax calculation failed:", err);
      return null;
    }
  };

  // Add item to quote
  const addItem = async (priceBookItem: PriceBookItem, quantity: number = 1) => {
    const counterpartyId = opportunity.data?.counterparty?.id;
    
    let taxes: TaxBreakdown | null = null;
    if (priceBookItem.product_id) {
      taxes = await calculateItemTaxes(
        priceBookItem.product_id,
        quantity,
        priceBookItem.unit_price,
        counterpartyId
      );
    }

    const baseValue = quantity * priceBookItem.unit_price;
    const total = taxes?.total || baseValue;

    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      product_id: priceBookItem.product_id,
      product_name: priceBookItem.product?.name || "Produto",
      quantity,
      unit_price: priceBookItem.unit_price,
      discount_percent: 0,
      taxes: taxes || undefined,
      total,
    };

    setItems((prev) => [...prev, newItem]);
    return newItem;
  };

  // Remove item from quote
  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Update item quantity or discount
  const updateItem = async (
    itemId: string,
    updates: Partial<Pick<QuoteItem, "quantity" | "discount_percent" | "unit_price">>
  ) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newQuantity = updates.quantity ?? item.quantity;
    const newUnitPrice = updates.unit_price ?? item.unit_price;
    const newDiscount = updates.discount_percent ?? item.discount_percent;

    const counterpartyId = opportunity.data?.counterparty?.id;
    
    let taxes: TaxBreakdown | null = null;
    if (item.product_id) {
      taxes = await calculateItemTaxes(
        item.product_id,
        newQuantity,
        newUnitPrice * (1 - newDiscount / 100),
        counterpartyId
      );
    }

    const baseValue = newQuantity * newUnitPrice * (1 - newDiscount / 100);
    const total = taxes?.total || baseValue;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              ...updates,
              taxes: taxes || undefined,
              total,
            }
          : i
      )
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price * (1 - item.discount_percent / 100),
      0
    );

    const totalTaxes = items.reduce((sum, item) => {
      if (!item.taxes) return sum;
      return sum + (item.taxes.ipi || 0) + (item.taxes.icms_st || 0);
    }, 0);

    const totalWithTaxes = subtotal + totalTaxes;

    return { subtotal, totalTaxes, totalWithTaxes };
  };

  // Create quote mutation
  const createQuote = useMutation({
    mutationFn: async (quoteData: {
      title?: string;
      discount_percent?: number;
      valid_until?: string;
      notes?: string;
      terms?: string;
    }) => {
      if (!currentCompany?.id || !opportunityId) {
        throw new Error("Dados incompletos");
      }

      const totals = calculateTotals();

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          company_id: currentCompany.id,
          opportunity_id: opportunityId,
          title: quoteData.title,
          status: "draft",
          discount_percent: quoteData.discount_percent || 0,
          subtotal: totals.subtotal,
          total_taxes: totals.totalTaxes,
          total_with_taxes: totals.totalWithTaxes,
          total_amount: totals.totalWithTaxes,
          valid_until: quoteData.valid_until,
          notes: quoteData.notes,
          terms: quoteData.terms,
        } as never)
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items with correct column names for tax persistence
      const quoteItems = items.map((item) => ({
        quote_id: quote.id,
        product_id: item.product_id,
        description: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        // Tax rates (for audit trail)
        tax_icms_rate: item.taxes?.icms_rate || 0,
        tax_ipi_rate: item.taxes?.ipi_rate || 0,
        tax_pis_rate: item.taxes?.pis_rate || 0,
        tax_cofins_rate: item.taxes?.cofins_rate || 0,
        // Tax amounts (calculated values)
        tax_icms_amount: item.taxes?.icms || 0,
        tax_icms_st_amount: item.taxes?.icms_st || 0,
        tax_ipi_amount: item.taxes?.ipi || 0,
        tax_pis_amount: item.taxes?.pis || 0,
        tax_cofins_amount: item.taxes?.cofins || 0,
        // Total
        total_amount: item.total,
      }));

      if (quoteItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(quoteItems as never);
        if (itemsError) throw itemsError;
      }

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Proposta criada com sucesso");
      setItems([]);
    },
    onError: (error) => {
      toast.error("Erro ao criar proposta: " + error.message);
    },
  });

  // Submit for approval mutation
  const submitForApproval = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "sent", approval_status: "pending" } as never)
        .eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Proposta enviada para aprovação");
    },
  });

  // Approve quote mutation
  const approveQuote = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase
        .from("quotes")
        .update({
          approval_status: "approved",
          approved_at: new Date().toISOString(),
          status: "sent",
        } as never)
        .eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Proposta aprovada");
    },
  });

  return {
    // State
    items,
    selectedPriceBookId,
    setSelectedPriceBookId,

    // Queries
    priceBooks,
    priceBookItems,
    opportunity,

    // Item operations
    addItem,
    removeItem,
    updateItem,

    // Calculations
    calculateTotals,
    calculateItemTaxes,

    // Mutations
    createQuote,
    submitForApproval,
    approveQuote,
  };
}
