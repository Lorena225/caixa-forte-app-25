export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          category_type: Database["public"]["Enums"]["account_category"]
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_managerial: boolean | null
          level: number | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_type: Database["public"]["Enums"]["account_category"]
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_managerial?: boolean | null
          level?: number | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_type?: Database["public"]["Enums"]["account_category"]
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_managerial?: boolean | null
          level?: number | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          month: number
          target_expense: number | null
          target_margin: number | null
          target_profit: number | null
          target_revenue: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          month: number
          target_expense?: number | null
          target_margin?: number | null
          target_profit?: number | null
          target_revenue?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          month?: number
          target_expense?: number | null
          target_margin?: number | null
          target_profit?: number | null
          target_revenue?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparties: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          document: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          type: Database["public"]["Enums"]["counterparty_type"]
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          type?: Database["public"]["Enums"]["counterparty_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          type?: Database["public"]["Enums"]["counterparty_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counterparties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          account_id: string
          company_id: string
          counterparty_id: string | null
          created_at: string | null
          description: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          first_due_date: string
          id: string
          installments: number
          is_active: boolean | null
          total_amount: number
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          account_id: string
          company_id: string
          counterparty_id?: string | null
          created_at?: string | null
          description: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          first_due_date: string
          id?: string
          installments: number
          is_active?: boolean | null
          total_amount: number
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          account_id?: string
          company_id?: string
          counterparty_id?: string | null
          created_at?: string | null
          description?: string
          direction?: Database["public"]["Enums"]["transaction_direction"]
          first_due_date?: string
          id?: string
          installments?: number
          is_active?: boolean | null
          total_amount?: number
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "installment_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          company_id: string
          cost_center_id: string | null
          counterparty_id: string | null
          created_at: string | null
          description: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          discount_amount: number | null
          discount_percent: number | null
          due_date: string
          id: string
          installment_number: number | null
          installment_plan_id: string | null
          interest_amount: number | null
          is_recurring: boolean | null
          notes: string | null
          original_amount: number
          paid_date: string | null
          payment_method_id: string | null
          recurrence_type: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
          transaction_date: string
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          account_id: string
          company_id: string
          cost_center_id?: string | null
          counterparty_id?: string | null
          created_at?: string | null
          description: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          discount_amount?: number | null
          discount_percent?: number | null
          due_date: string
          id?: string
          installment_number?: number | null
          installment_plan_id?: string | null
          interest_amount?: number | null
          is_recurring?: boolean | null
          notes?: string | null
          original_amount: number
          paid_date?: string | null
          payment_method_id?: string | null
          recurrence_type?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
          transaction_date: string
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          account_id?: string
          company_id?: string
          cost_center_id?: string | null
          counterparty_id?: string | null
          created_at?: string | null
          description?: string
          direction?: Database["public"]["Enums"]["transaction_direction"]
          discount_amount?: number | null
          discount_percent?: number | null
          due_date?: string
          id?: string
          installment_number?: number | null
          installment_plan_id?: string | null
          interest_amount?: number | null
          is_recurring?: boolean | null
          notes?: string | null
          original_amount?: number
          paid_date?: string | null
          payment_method_id?: string | null
          recurrence_type?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount?: number
          transaction_date?: string
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_installment_plan"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          closing_day: number | null
          company_id: string
          created_at: string | null
          due_day: number | null
          id: string
          is_active: boolean | null
          name: string
          opening_balance: number | null
          type: Database["public"]["Enums"]["wallet_type"]
          updated_at: string | null
        }
        Insert: {
          closing_day?: number | null
          company_id: string
          created_at?: string | null
          due_day?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          opening_balance?: number | null
          type?: Database["public"]["Enums"]["wallet_type"]
          updated_at?: string | null
        }
        Update: {
          closing_day?: number | null
          company_id?: string
          created_at?: string | null
          due_day?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          opening_balance?: number | null
          type?: Database["public"]["Enums"]["wallet_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_ap_open: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          company_id: string | null
          cost_center_id: string | null
          cost_center_name: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          created_at: string | null
          days_late: number | null
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"] | null
          discount_amount: number | null
          discount_percent: number | null
          due_date: string | null
          id: string | null
          installment_number: number | null
          installment_plan_id: string | null
          interest_amount: number | null
          is_overdue: boolean | null
          is_recurring: boolean | null
          notes: string | null
          original_amount: number | null
          paid_date: string | null
          payment_method_id: string | null
          recurrence_type: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          total_amount: number | null
          transaction_date: string | null
          updated_at: string | null
          wallet_id: string | null
          wallet_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_installment_plan"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ar_open: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          company_id: string | null
          cost_center_id: string | null
          cost_center_name: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          created_at: string | null
          days_late: number | null
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"] | null
          discount_amount: number | null
          discount_percent: number | null
          due_date: string | null
          id: string | null
          installment_number: number | null
          installment_plan_id: string | null
          interest_amount: number | null
          is_overdue: boolean | null
          is_recurring: boolean | null
          notes: string | null
          original_amount: number | null
          paid_date: string | null
          payment_method_id: string | null
          recurrence_type: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          total_amount: number | null
          transaction_date: string | null
          updated_at: string | null
          wallet_id: string | null
          wallet_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_installment_plan"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cashflow_monthly: {
        Row: {
          company_id: string | null
          entradas_pagas: number | null
          entradas_previstas: number | null
          month: number | null
          resultado: number | null
          saidas_pagas: number | null
          saidas_previstas: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dre_monthly: {
        Row: {
          account_code: string | null
          account_name: string | null
          category_type: Database["public"]["Enums"]["account_category"] | null
          company_id: string | null
          month: number | null
          total: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rc_flow_by_account: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          category_type: Database["public"]["Enums"]["account_category"] | null
          company_id: string | null
          direction: Database["public"]["Enums"]["transaction_direction"] | null
          month: number | null
          valor_pago: number | null
          valor_previsto: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rc_indicators_monthly: {
        Row: {
          company_id: string | null
          despesa_prevista: number | null
          despesa_realizada: number | null
          lucratividade: number | null
          lucro_prejuizo: number | null
          month: number | null
          receita_prevista: number | null
          receita_realizada: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_role: {
        Args: { p_company_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      user_can_write: { Args: { p_company_id: string }; Returns: boolean }
      user_has_company_access: {
        Args: { p_company_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_category:
        | "ativo"
        | "passivo"
        | "patrimonio_liquido"
        | "receita"
        | "custo"
        | "despesa"
      counterparty_type: "cliente" | "fornecedor" | "ambos"
      transaction_direction: "entrada" | "saida"
      transaction_status: "rascunho" | "lancado" | "pago" | "cancelado"
      user_role: "admin" | "gestor" | "visualizador"
      wallet_type: "caixa" | "banco" | "cartao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_category: [
        "ativo",
        "passivo",
        "patrimonio_liquido",
        "receita",
        "custo",
        "despesa",
      ],
      counterparty_type: ["cliente", "fornecedor", "ambos"],
      transaction_direction: ["entrada", "saida"],
      transaction_status: ["rascunho", "lancado", "pago", "cancelado"],
      user_role: ["admin", "gestor", "visualizador"],
      wallet_type: ["caixa", "banco", "cartao"],
    },
  },
} as const
