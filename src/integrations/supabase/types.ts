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
      categorization_rules: {
        Row: {
          account_id: string | null
          company_id: string
          conditions_json: Json
          cost_center_id: string | null
          counterparty_id: string | null
          created_at: string | null
          id: string
          integration_id: string | null
          is_active: boolean | null
          name: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          company_id: string
          conditions_json?: Json
          cost_center_id?: string | null
          counterparty_id?: string | null
          created_at?: string | null
          id?: string
          integration_id?: string | null
          is_active?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          company_id?: string
          conditions_json?: Json
          cost_center_id?: string | null
          counterparty_id?: string | null
          created_at?: string | null
          id?: string
          integration_id?: string | null
          is_active?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "categorization_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
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
      external_keys: {
        Row: {
          company_id: string
          entity: Database["public"]["Enums"]["import_entity_type"]
          external_key: string
          first_seen_at: string | null
          id: string
          record_id: string
          source: string
        }
        Insert: {
          company_id: string
          entity: Database["public"]["Enums"]["import_entity_type"]
          external_key: string
          first_seen_at?: string | null
          id?: string
          record_id: string
          source?: string
        }
        Update: {
          company_id?: string
          entity?: Database["public"]["Enums"]["import_entity_type"]
          external_key?: string
          first_seen_at?: string | null
          id?: string
          record_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          company_id: string
          first_seen_at: string | null
          id: string
          key: string
          scope: string
        }
        Insert: {
          company_id: string
          first_seen_at?: string | null
          id?: string
          key: string
          scope: string
        }
        Update: {
          company_id?: string
          first_seen_at?: string | null
          id?: string
          key?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          company_id: string
          created_at: string | null
          entity: Database["public"]["Enums"]["import_entity_type"] | null
          error_details: string | null
          finished_at: string | null
          id: string
          integration_id: string
          mapping_id: string | null
          processed_rows: number | null
          source_filename: string | null
          source_type: Database["public"]["Enums"]["import_source_type"]
          started_at: string | null
          status: Database["public"]["Enums"]["import_batch_status"]
          summary_json: Json | null
          total_rows: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          entity?: Database["public"]["Enums"]["import_entity_type"] | null
          error_details?: string | null
          finished_at?: string | null
          id?: string
          integration_id: string
          mapping_id?: string | null
          processed_rows?: number | null
          source_filename?: string | null
          source_type?: Database["public"]["Enums"]["import_source_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          summary_json?: Json | null
          total_rows?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          entity?: Database["public"]["Enums"]["import_entity_type"] | null
          error_details?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string
          mapping_id?: string | null
          processed_rows?: number | null
          source_filename?: string | null
          source_type?: Database["public"]["Enums"]["import_source_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          summary_json?: Json | null
          total_rows?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "import_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      import_mappings: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          defaults_json: Json | null
          entity: Database["public"]["Enums"]["import_entity_type"]
          id: string
          is_default: boolean | null
          mapping_json: Json
          name: string
          rules_json: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          defaults_json?: Json | null
          entity: Database["public"]["Enums"]["import_entity_type"]
          id?: string
          is_default?: boolean | null
          mapping_json?: Json
          name: string
          rules_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          defaults_json?: Json | null
          entity?: Database["public"]["Enums"]["import_entity_type"]
          id?: string
          is_default?: boolean | null
          mapping_json?: Json
          name?: string
          rules_json?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          batch_id: string
          company_id: string
          created_at: string | null
          errors_json: Json | null
          id: string
          normalized_json: Json | null
          raw_json: Json
          record_id: string | null
          row_number: number
          status: Database["public"]["Enums"]["import_row_status"]
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          company_id: string
          created_at?: string | null
          errors_json?: Json | null
          id?: string
          normalized_json?: Json | null
          raw_json: Json
          record_id?: string | null
          row_number: number
          status?: Database["public"]["Enums"]["import_row_status"]
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          company_id?: string
          created_at?: string | null
          errors_json?: Json | null
          id?: string
          normalized_json?: Json | null
          raw_json?: Json
          record_id?: string | null
          row_number?: number
          status?: Database["public"]["Enums"]["import_row_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      import_templates: {
        Row: {
          columns_json: Json
          created_at: string | null
          description: string | null
          entity: Database["public"]["Enums"]["import_entity_type"]
          id: string
          instructions_json: Json | null
          is_active: boolean | null
          name: string
          sample_data_json: Json | null
          updated_at: string | null
          version: number
        }
        Insert: {
          columns_json?: Json
          created_at?: string | null
          description?: string | null
          entity: Database["public"]["Enums"]["import_entity_type"]
          id?: string
          instructions_json?: Json | null
          is_active?: boolean | null
          name: string
          sample_data_json?: Json | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          columns_json?: Json
          created_at?: string | null
          description?: string | null
          entity?: Database["public"]["Enums"]["import_entity_type"]
          id?: string
          instructions_json?: Json | null
          is_active?: boolean | null
          name?: string
          sample_data_json?: Json | null
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      imported_transactions: {
        Row: {
          amount: number
          batch_id: string
          company_id: string
          counterparty_raw: string | null
          created_at: string | null
          description_raw: string | null
          direction: string
          duplicate_of_id: string | null
          external_account_id: string | null
          external_hash: string
          external_id: string | null
          fit_id: string | null
          id: string
          integration_id: string
          posted_at: string
          processed: boolean | null
          raw_json: Json | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          batch_id: string
          company_id: string
          counterparty_raw?: string | null
          created_at?: string | null
          description_raw?: string | null
          direction: string
          duplicate_of_id?: string | null
          external_account_id?: string | null
          external_hash: string
          external_id?: string | null
          fit_id?: string | null
          id?: string
          integration_id: string
          posted_at: string
          processed?: boolean | null
          raw_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string
          company_id?: string
          counterparty_raw?: string | null
          created_at?: string | null
          description_raw?: string | null
          direction?: string
          duplicate_of_id?: string | null
          external_account_id?: string | null
          external_hash?: string
          external_id?: string | null
          fit_id?: string | null
          id?: string
          integration_id?: string
          posted_at?: string
          processed?: boolean | null
          raw_json?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_transactions_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "imported_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_transactions_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
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
      integration_accounts: {
        Row: {
          company_id: string
          created_at: string | null
          currency: string | null
          external_account_id: string
          external_account_name: string | null
          id: string
          integration_id: string
          is_active: boolean | null
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          currency?: string | null
          external_account_id: string
          external_account_name?: string | null
          id?: string
          integration_id: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          currency?: string | null
          external_account_id?: string
          external_account_name?: string | null
          id?: string
          integration_id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_accounts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_accounts_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          auth_type: Database["public"]["Enums"]["integration_auth_type"]
          company_id: string
          created_at: string | null
          credentials_encrypted: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          name: string
          provider: Database["public"]["Enums"]["integration_provider"]
          settings_json: Json | null
          status: Database["public"]["Enums"]["integration_status"]
          sync_interval_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          auth_type?: Database["public"]["Enums"]["integration_auth_type"]
          company_id: string
          created_at?: string | null
          credentials_encrypted?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          name: string
          provider: Database["public"]["Enums"]["integration_provider"]
          settings_json?: Json | null
          status?: Database["public"]["Enums"]["integration_status"]
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          auth_type?: Database["public"]["Enums"]["integration_auth_type"]
          company_id?: string
          created_at?: string | null
          credentials_encrypted?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          name?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          settings_json?: Json | null
          status?: Database["public"]["Enums"]["integration_status"]
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      reconciliation_matches: {
        Row: {
          action_taken: Database["public"]["Enums"]["reconciliation_action"]
          approved_at: string | null
          approved_by_user_id: string | null
          company_id: string
          confidence: number
          created_at: string | null
          id: string
          imported_transaction_id: string
          match_type: Database["public"]["Enums"]["match_type"]
          notes: string | null
          rules_applied_json: Json | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          action_taken?: Database["public"]["Enums"]["reconciliation_action"]
          approved_at?: string | null
          approved_by_user_id?: string | null
          company_id: string
          confidence?: number
          created_at?: string | null
          id?: string
          imported_transaction_id: string
          match_type: Database["public"]["Enums"]["match_type"]
          notes?: string | null
          rules_applied_json?: Json | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["reconciliation_action"]
          approved_at?: string | null
          approved_by_user_id?: string | null
          company_id?: string
          confidence?: number
          created_at?: string | null
          id?: string
          imported_transaction_id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          notes?: string | null
          rules_applied_json?: Json | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_matches_imported_transaction_id_fkey"
            columns: ["imported_transaction_id"]
            isOneToOne: false
            referencedRelation: "imported_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_matches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_matches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ap_open"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_matches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ar_open"
            referencedColumns: ["id"]
          },
        ]
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
      webhook_events: {
        Row: {
          company_id: string
          created_at: string | null
          error_message: string | null
          id: string
          integration_id: string
          payload_json: Json | null
          processed_at: string | null
          provider_event_id: string | null
          received_at: string | null
          status: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id: string
          payload_json?: Json | null
          processed_at?: string | null
          provider_event_id?: string | null
          received_at?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string
          payload_json?: Json | null
          processed_at?: string | null
          provider_event_id?: string | null
          received_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
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
      import_batch_status: "processing" | "success" | "partial" | "error"
      import_entity_type:
        | "accounts"
        | "counterparties"
        | "wallets"
        | "cost_centers"
        | "transactions_ar"
        | "transactions_ap"
        | "transactions"
        | "budgets"
      import_row_status:
        | "pending"
        | "valid"
        | "error"
        | "imported"
        | "updated"
        | "duplicate"
        | "skipped"
      import_source_type: "manual_upload" | "scheduled_sync" | "webhook"
      integration_auth_type: "file" | "oauth" | "api_key" | "webhook"
      integration_provider:
        | "ofx"
        | "csv"
        | "stripe"
        | "mercadopago"
        | "asaas"
        | "pagarme"
        | "omie"
        | "tiny"
        | "bling"
        | "openfinance"
        | "other"
      integration_status: "disconnected" | "connected" | "error" | "disabled"
      match_type: "exact" | "fuzzy" | "manual"
      reconciliation_action: "mark_paid" | "create" | "ignore" | "pending"
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
      import_batch_status: ["processing", "success", "partial", "error"],
      import_entity_type: [
        "accounts",
        "counterparties",
        "wallets",
        "cost_centers",
        "transactions_ar",
        "transactions_ap",
        "transactions",
        "budgets",
      ],
      import_row_status: [
        "pending",
        "valid",
        "error",
        "imported",
        "updated",
        "duplicate",
        "skipped",
      ],
      import_source_type: ["manual_upload", "scheduled_sync", "webhook"],
      integration_auth_type: ["file", "oauth", "api_key", "webhook"],
      integration_provider: [
        "ofx",
        "csv",
        "stripe",
        "mercadopago",
        "asaas",
        "pagarme",
        "omie",
        "tiny",
        "bling",
        "openfinance",
        "other",
      ],
      integration_status: ["disconnected", "connected", "error", "disabled"],
      match_type: ["exact", "fuzzy", "manual"],
      reconciliation_action: ["mark_paid", "create", "ignore", "pending"],
      transaction_direction: ["entrada", "saida"],
      transaction_status: ["rascunho", "lancado", "pago", "cancelado"],
      user_role: ["admin", "gestor", "visualizador"],
      wallet_type: ["caixa", "banco", "cartao"],
    },
  },
} as const
