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
      account_categories: {
        Row: {
          category_type: Database["public"]["Enums"]["account_category"]
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          category_type: Database["public"]["Enums"]["account_category"]
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          category_type?: Database["public"]["Enums"]["account_category"]
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          category_id: string | null
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
          category_id?: string | null
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
          category_id?: string | null
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
            foreignKeyName: "accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
        ]
      }
      action_rollbacks: {
        Row: {
          action_result_id: string
          company_id: string
          created_at: string | null
          executed_at: string | null
          id: string
          requested_by_phone: string | null
          requested_by_user_id: string | null
          rollback_error: string | null
          rollback_payload_json: Json
          rollback_status: string | null
        }
        Insert: {
          action_result_id: string
          company_id: string
          created_at?: string | null
          executed_at?: string | null
          id?: string
          requested_by_phone?: string | null
          requested_by_user_id?: string | null
          rollback_error?: string | null
          rollback_payload_json: Json
          rollback_status?: string | null
        }
        Update: {
          action_result_id?: string
          company_id?: string
          created_at?: string | null
          executed_at?: string | null
          id?: string
          requested_by_phone?: string | null
          requested_by_user_id?: string | null
          rollback_error?: string | null
          rollback_payload_json?: Json
          rollback_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_rollbacks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_results: {
        Row: {
          affected_tables_json: Json | null
          can_rollback: boolean | null
          company_id: string
          confirmation_id: string | null
          created_at: string | null
          created_ids_json: Json | null
          decision_id: string
          error_json: Json | null
          executed_actions_json: Json
          executed_at: string | null
          id: string
          rolled_back_at: string | null
          status: string | null
        }
        Insert: {
          affected_tables_json?: Json | null
          can_rollback?: boolean | null
          company_id: string
          confirmation_id?: string | null
          created_at?: string | null
          created_ids_json?: Json | null
          decision_id: string
          error_json?: Json | null
          executed_actions_json?: Json
          executed_at?: string | null
          id?: string
          rolled_back_at?: string | null
          status?: string | null
        }
        Update: {
          affected_tables_json?: Json | null
          can_rollback?: boolean | null
          company_id?: string
          confirmation_id?: string | null
          created_at?: string | null
          created_ids_json?: Json | null
          decision_id?: string
          error_json?: Json | null
          executed_actions_json?: Json
          executed_at?: string | null
          id?: string
          rolled_back_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_company_settings: {
        Row: {
          agent_profile_id: string | null
          allow_auto_create_and_settle: boolean
          allow_auto_create_counterparty: boolean
          allow_auto_settle: boolean
          autopilot_mode: string
          company_id: string
          enabled: boolean
          high_risk_amount_limit: number | null
          require_pin_for_high_risk: boolean
          thresholds_json: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_profile_id?: string | null
          allow_auto_create_and_settle?: boolean
          allow_auto_create_counterparty?: boolean
          allow_auto_settle?: boolean
          autopilot_mode?: string
          company_id: string
          enabled?: boolean
          high_risk_amount_limit?: number | null
          require_pin_for_high_risk?: boolean
          thresholds_json?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_profile_id?: string | null
          allow_auto_create_and_settle?: boolean
          allow_auto_create_counterparty?: boolean
          allow_auto_settle?: boolean
          autopilot_mode?: string
          company_id?: string
          enabled?: boolean
          high_risk_amount_limit?: number | null
          require_pin_for_high_risk?: boolean
          thresholds_json?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_confirmations: {
        Row: {
          approved_at: string | null
          approved_by_phone: string | null
          approved_by_user_id: string | null
          company_id: string
          confirmation_type: string | null
          created_at: string | null
          decision_id: string
          id: string
          notes: string | null
          pin_verified: boolean | null
          selected_option: number | null
          state: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_phone?: string | null
          approved_by_user_id?: string | null
          company_id: string
          confirmation_type?: string | null
          created_at?: string | null
          decision_id: string
          id?: string
          notes?: string | null
          pin_verified?: boolean | null
          selected_option?: number | null
          state?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_phone?: string | null
          approved_by_user_id?: string | null
          company_id?: string
          confirmation_type?: string | null
          created_at?: string | null
          decision_id?: string
          id?: string
          notes?: string | null
          pin_verified?: boolean | null
          selected_option?: number | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_confirmations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_decisions: {
        Row: {
          ai_request_id: string | null
          ambiguous_matches_json: Json | null
          company_id: string
          confidence: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          inbox_id: string | null
          intent: string
          missing_fields_json: Json | null
          needs_confirmation: boolean | null
          proposed_actions_json: Json
          risk_level: string | null
          risk_reasons_json: Json | null
          status: string | null
        }
        Insert: {
          ai_request_id?: string | null
          ambiguous_matches_json?: Json | null
          company_id: string
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          inbox_id?: string | null
          intent: string
          missing_fields_json?: Json | null
          needs_confirmation?: boolean | null
          proposed_actions_json?: Json
          risk_level?: string | null
          risk_reasons_json?: Json | null
          status?: string | null
        }
        Update: {
          ai_request_id?: string | null
          ambiguous_matches_json?: Json | null
          company_id?: string
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          inbox_id?: string | null
          intent?: string
          missing_fields_json?: Json | null
          needs_confirmation?: boolean | null
          proposed_actions_json?: Json
          risk_level?: string | null
          risk_reasons_json?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          action_result_id: string | null
          company_id: string
          correction_json: Json | null
          created_at: string | null
          decision_id: string | null
          feedback_type: string
          field_corrected: string | null
          generated_rule_id: string | null
          id: string
          notes: string | null
          original_json: Json | null
          phone: string | null
          rule_approved: boolean | null
          user_id: string | null
        }
        Insert: {
          action_result_id?: string | null
          company_id: string
          correction_json?: Json | null
          created_at?: string | null
          decision_id?: string | null
          feedback_type: string
          field_corrected?: string | null
          generated_rule_id?: string | null
          id?: string
          notes?: string | null
          original_json?: Json | null
          phone?: string | null
          rule_approved?: boolean | null
          user_id?: string | null
        }
        Update: {
          action_result_id?: string | null
          company_id?: string
          correction_json?: Json | null
          created_at?: string | null
          decision_id?: string | null
          feedback_type?: string
          field_corrected?: string | null
          generated_rule_id?: string | null
          id?: string
          notes?: string | null
          original_json?: Json | null
          phone?: string | null
          rule_approved?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_requests: {
        Row: {
          company_id: string
          cost_estimate: number | null
          created_at: string | null
          error_message: string | null
          file_id: string | null
          id: string
          inbox_id: string | null
          input_json: Json
          job_id: string | null
          latency_ms: number | null
          model: string
          output_json: Json | null
          raw_response: Json | null
          status: string | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          company_id: string
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          file_id?: string | null
          id?: string
          inbox_id?: string | null
          input_json: Json
          job_id?: string | null
          latency_ms?: number | null
          model?: string
          output_json?: Json | null
          raw_response?: Json | null
          status?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          company_id?: string
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          file_id?: string | null
          id?: string
          inbox_id?: string | null
          input_json?: Json
          job_id?: string | null
          latency_ms?: number | null
          model?: string
          output_json?: Json | null
          raw_response?: Json | null
          status?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      allocation_rule_items: {
        Row: {
          created_at: string | null
          id: string
          percentage: number | null
          rule_id: string
          target_dimension_id: string
          target_value_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          percentage?: number | null
          rule_id: string
          target_dimension_id: string
          target_value_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          percentage?: number | null
          rule_id?: string
          target_dimension_id?: string
          target_value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocation_rule_items_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "allocation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_rule_items_target_dimension_id_fkey"
            columns: ["target_dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_rule_items_target_value_id_fkey"
            columns: ["target_value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
        ]
      }
      allocation_rules: {
        Row: {
          allocation_type: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          source_dimension_id: string | null
          source_value_id: string | null
          updated_at: string | null
        }
        Insert: {
          allocation_type: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          source_dimension_id?: string | null
          source_value_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allocation_type?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          source_dimension_id?: string | null
          source_value_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_rules_source_dimension_id_fkey"
            columns: ["source_dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_rules_source_value_id_fkey"
            columns: ["source_value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action: string
          action_at: string | null
          action_by: string
          created_at: string | null
          delegated_to: string | null
          id: string
          notes: string | null
          request_id: string
          step_id: string
        }
        Insert: {
          action: string
          action_at?: string | null
          action_by: string
          created_at?: string | null
          delegated_to?: string | null
          id?: string
          notes?: string | null
          request_id: string
          step_id: string
        }
        Update: {
          action?: string
          action_at?: string | null
          action_by?: string
          created_at?: string | null
          delegated_to?: string | null
          id?: string
          notes?: string | null
          request_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_pending_approvals"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approval_actions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          entity_id: string
          entity_type: string
          id: string
          requested_at: string | null
          requested_by: string | null
          status: string | null
          workflow_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          entity_id: string
          entity_type: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          workflow_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          role_id: string | null
          step_order: number
          user_id: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          role_id?: string | null
          step_order: number
          user_id?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          role_id?: string | null
          step_order?: number
          user_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          company_id: string
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
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
      automation_rules: {
        Row: {
          action_json: Json
          company_id: string
          conditions_json: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          hit_count: number | null
          id: string
          is_active: boolean | null
          last_hit_at: string | null
          name: string
          pattern: string
          pattern_type: string
          priority: number | null
          rule_type: string
          source: string | null
          updated_at: string | null
        }
        Insert: {
          action_json?: Json
          company_id: string
          conditions_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          last_hit_at?: string | null
          name: string
          pattern: string
          pattern_type?: string
          priority?: number | null
          rule_type: string
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          action_json?: Json
          company_id?: string
          conditions_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          last_hit_at?: string | null
          name?: string
          pattern?: string
          pattern_type?: string
          priority?: number | null
          rule_type?: string
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_artifacts: {
        Row: {
          checksum: string | null
          created_at: string | null
          file_size_bytes: number | null
          id: string
          job_id: string
          storage_path: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          id?: string
          job_id: string
          storage_path: string
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          id?: string
          job_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_artifacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "backup_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_jobs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          scheduled_at: string | null
          scope_json: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          scheduled_at?: string | null
          scope_json?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          scheduled_at?: string | null
          scope_json?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_imports: {
        Row: {
          closing_balance: number | null
          company_id: string
          created_at: string | null
          error_message: string | null
          file_format: string | null
          file_id: string | null
          id: string
          line_count: number | null
          matched_count: number | null
          opening_balance: number | null
          original_filename: string | null
          pending_count: number | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          source: string | null
          status: string | null
          summary_json: Json | null
          total_credits: number | null
          total_debits: number | null
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          closing_balance?: number | null
          company_id: string
          created_at?: string | null
          error_message?: string | null
          file_format?: string | null
          file_id?: string | null
          id?: string
          line_count?: number | null
          matched_count?: number | null
          opening_balance?: number | null
          original_filename?: string | null
          pending_count?: number | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          source?: string | null
          status?: string | null
          summary_json?: Json | null
          total_credits?: number | null
          total_debits?: number | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          closing_balance?: number | null
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          file_format?: string | null
          file_id?: string | null
          id?: string
          line_count?: number | null
          matched_count?: number | null
          opening_balance?: number | null
          original_filename?: string | null
          pending_count?: number | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          source?: string | null
          status?: string | null
          summary_json?: Json | null
          total_credits?: number | null
          total_debits?: number | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_lines: {
        Row: {
          amount: number
          balance: number | null
          check_number: string | null
          created_at: string | null
          description: string | null
          direction: string
          fit_id: string | null
          id: string
          is_reconciled: boolean | null
          line_number: number | null
          posted_date: string
          reconciled_at: string | null
          reference_number: string | null
          statement_id: string
        }
        Insert: {
          amount: number
          balance?: number | null
          check_number?: string | null
          created_at?: string | null
          description?: string | null
          direction: string
          fit_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          line_number?: number | null
          posted_date: string
          reconciled_at?: string | null
          reference_number?: string | null
          statement_id: string
        }
        Update: {
          amount?: number
          balance?: number | null
          check_number?: string | null
          created_at?: string | null
          description?: string | null
          direction?: string
          fit_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          line_number?: number | null
          posted_date?: string
          reconciled_at?: string | null
          reference_number?: string | null
          statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          closing_balance: number | null
          company_id: string
          created_at: string | null
          id: string
          imported_at: string | null
          opening_balance: number | null
          source_filename: string | null
          source_type: string | null
          statement_date: string
          wallet_id: string
        }
        Insert: {
          closing_balance?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          imported_at?: string | null
          opening_balance?: number | null
          source_filename?: string | null
          source_type?: string | null
          statement_date: string
          wallet_id: string
        }
        Update: {
          closing_balance?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          imported_at?: string | null
          opening_balance?: number | null
          source_filename?: string | null
          source_type?: string | null
          statement_date?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "bank_statements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          code: string
          company_id: string
          created_at: string | null
          id: string
          ie: string | null
          im: string | null
          is_active: boolean | null
          is_headquarters: boolean | null
          name: string
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          is_active?: boolean | null
          is_headquarters?: boolean | null
          name: string
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          is_active?: boolean | null
          is_headquarters?: boolean | null
          name?: string
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
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
      cash_positions: {
        Row: {
          closing_balance: number
          company_id: string
          created_at: string | null
          id: string
          opening_balance: number
          position_date: string
          projected_balance: number | null
          projected_inflows: number | null
          projected_outflows: number | null
          total_inflows: number | null
          total_outflows: number | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          closing_balance: number
          company_id: string
          created_at?: string | null
          id?: string
          opening_balance: number
          position_date: string
          projected_balance?: number | null
          projected_inflows?: number | null
          projected_outflows?: number | null
          total_inflows?: number | null
          total_outflows?: number | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          closing_balance?: number
          company_id?: string
          created_at?: string | null
          id?: string
          opening_balance?: number
          position_date?: string
          projected_balance?: number | null
          projected_inflows?: number | null
          projected_outflows?: number | null
          total_inflows?: number | null
          total_outflows?: number | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_positions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "cash_positions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
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
            foreignKeyName: "categorization_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
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
            foreignKeyName: "categorization_rules_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
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
      cnab_files: {
        Row: {
          cnab_layout: string
          company_id: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          file_content: string | null
          file_name: string
          file_type: string
          generation_date: string | null
          id: string
          operation_type: string
          processing_date: string | null
          record_count: number | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          cnab_layout: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_content?: string | null
          file_name: string
          file_type: string
          generation_date?: string | null
          id?: string
          operation_type: string
          processing_date?: string | null
          record_count?: number | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          cnab_layout?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_content?: string | null
          file_name?: string
          file_type?: string
          generation_date?: string | null
          id?: string
          operation_type?: string
          processing_date?: string | null
          record_count?: number | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnab_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnab_files_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "cnab_files_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      cnab_occurrences: {
        Row: {
          amount: number | null
          cnab_file_id: string
          counterparty_name: string | null
          created_at: string | null
          document_number: string | null
          due_date: string | null
          id: string
          line_number: number | null
          occurrence_code: string
          occurrence_description: string | null
          payment_date: string | null
          related_transaction_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          cnab_file_id: string
          counterparty_name?: string | null
          created_at?: string | null
          document_number?: string | null
          due_date?: string | null
          id?: string
          line_number?: number | null
          occurrence_code: string
          occurrence_description?: string | null
          payment_date?: string | null
          related_transaction_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          cnab_file_id?: string
          counterparty_name?: string | null
          created_at?: string | null
          document_number?: string | null
          due_date?: string | null
          id?: string
          line_number?: number | null
          occurrence_code?: string
          occurrence_description?: string | null
          payment_date?: string | null
          related_transaction_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cnab_occurrences_cnab_file_id_fkey"
            columns: ["cnab_file_id"]
            isOneToOne: false
            referencedRelation: "cnab_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnab_occurrences_related_transaction_id_fkey"
            columns: ["related_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnab_occurrences_related_transaction_id_fkey"
            columns: ["related_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ap_open"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnab_occurrences_related_transaction_id_fkey"
            columns: ["related_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ar_open"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_actions: {
        Row: {
          channel: string
          company_id: string
          created_at: string | null
          customer_invoice_id: string
          id: string
          response_notes: string | null
          rule_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string | null
          customer_invoice_id: string
          id?: string
          response_notes?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string | null
          customer_invoice_id?: string
          id?: string
          response_notes?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_actions_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_actions_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "collection_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_rules: {
        Row: {
          channel: string
          company_id: string
          created_at: string | null
          days_after_due: number | null
          days_before_due: number | null
          id: string
          is_active: boolean | null
          name: string
          template_id: string | null
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string | null
          days_after_due?: number | null
          days_before_due?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          template_id?: string | null
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string | null
          days_after_due?: number | null
          days_before_due?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_rules_company_id_fkey"
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
      company_ai_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          encrypted_key: string
          encryption_meta: Json
          id: string
          is_active: boolean
          key_last4: string
          provider: string
          revoked_at: string | null
          rotated_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          encrypted_key: string
          encryption_meta?: Json
          id?: string
          is_active?: boolean
          key_last4: string
          provider?: string
          revoked_at?: string | null
          rotated_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          encrypted_key?: string
          encryption_meta?: Json
          id?: string
          is_active?: boolean
          key_last4?: string
          provider?: string
          revoked_at?: string | null
          rotated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_ai_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      cost_center_closure: {
        Row: {
          ancestor_id: string
          company_id: string
          depth: number
          descendant_id: string
          id: string
        }
        Insert: {
          ancestor_id: string
          company_id: string
          depth?: number
          descendant_id: string
          id?: string
        }
        Update: {
          ancestor_id?: string
          company_id?: string
          depth?: number
          descendant_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_center_closure_ancestor_id_fkey"
            columns: ["ancestor_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_closure_ancestor_id_fkey"
            columns: ["ancestor_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_closure_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_closure_descendant_id_fkey"
            columns: ["descendant_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_closure_descendant_id_fkey"
            columns: ["descendant_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_center_hierarchy_settings: {
        Row: {
          auto_create_root: boolean
          code_policy_json: Json | null
          company_id: string
          created_at: string
          level_labels_json: Json
          level_types_json: Json
          levels_enabled: number
          posting_level_max: number | null
          posting_level_min: number | null
          posting_policy: string
          require_cost_center: boolean
          updated_at: string
        }
        Insert: {
          auto_create_root?: boolean
          code_policy_json?: Json | null
          company_id: string
          created_at?: string
          level_labels_json?: Json
          level_types_json?: Json
          levels_enabled?: number
          posting_level_max?: number | null
          posting_level_min?: number | null
          posting_policy?: string
          require_cost_center?: boolean
          updated_at?: string
        }
        Update: {
          auto_create_root?: boolean
          code_policy_json?: Json | null
          company_id?: string
          created_at?: string
          level_labels_json?: Json
          level_types_json?: Json
          levels_enabled?: number
          posting_level_max?: number | null
          posting_level_min?: number | null
          posting_policy?: string
          require_cost_center?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_center_hierarchy_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_center_responsibles: {
        Row: {
          company_id: string
          cost_center_id: string
          created_at: string
          id: string
          limits_json: Json | null
          resp_role: string
          user_id: string
        }
        Insert: {
          company_id: string
          cost_center_id: string
          created_at?: string
          id?: string
          limits_json?: Json | null
          resp_role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          cost_center_id?: string
          created_at?: string
          id?: string
          limits_json?: Json | null
          resp_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_center_responsibles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_responsibles_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_center_responsibles_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          branch_id: string | null
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_leaf: boolean
          level: number
          level_type: string | null
          manager_user_id: string | null
          name: string
          parent_id: string | null
          path: string
          path_codes: string
          tags_json: Json | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          branch_id?: string | null
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_leaf?: boolean
          level?: number
          level_type?: string | null
          manager_user_id?: string | null
          name: string
          parent_id?: string | null
          path?: string
          path_codes?: string
          tags_json?: Json | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          branch_id?: string | null
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_leaf?: boolean
          level?: number
          level_type?: string | null
          manager_user_id?: string | null
          name?: string
          parent_id?: string | null
          path?: string
          path_codes?: string
          tags_json?: Json | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparties: {
        Row: {
          address: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          bank_account: string | null
          bank_account_digit: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_agency_digit: string | null
          bank_code: string | null
          bank_name: string | null
          client_notes: string | null
          collection_ready: boolean | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          credit_limit: number | null
          delivery_address_city: string | null
          delivery_address_complement: string | null
          delivery_address_neighborhood: string | null
          delivery_address_number: string | null
          delivery_address_state: string | null
          delivery_address_street: string | null
          delivery_address_zip: string | null
          delivery_same_as_billing: boolean | null
          document: string | null
          email: string | null
          finance_contact_email: string | null
          finance_contact_name: string | null
          finance_contact_phone: string | null
          fiscal_ready: boolean | null
          id: string
          ie: string | null
          ie_is_exempt: boolean | null
          im: string | null
          is_active: boolean | null
          is_client: boolean
          is_supplier: boolean
          legal_name: string | null
          missing_fields_json: Json | null
          name: string
          nf_email: string | null
          payment_ready: boolean | null
          payment_terms_payable: number | null
          payment_terms_receivable: number | null
          person_type: string
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          supplier_notes: string | null
          trade_name: string | null
          type: Database["public"]["Enums"]["counterparty_type"]
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          bank_account?: string | null
          bank_account_digit?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_agency_digit?: string | null
          bank_code?: string | null
          bank_name?: string | null
          client_notes?: string | null
          collection_ready?: boolean | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_limit?: number | null
          delivery_address_city?: string | null
          delivery_address_complement?: string | null
          delivery_address_neighborhood?: string | null
          delivery_address_number?: string | null
          delivery_address_state?: string | null
          delivery_address_street?: string | null
          delivery_address_zip?: string | null
          delivery_same_as_billing?: boolean | null
          document?: string | null
          email?: string | null
          finance_contact_email?: string | null
          finance_contact_name?: string | null
          finance_contact_phone?: string | null
          fiscal_ready?: boolean | null
          id?: string
          ie?: string | null
          ie_is_exempt?: boolean | null
          im?: string | null
          is_active?: boolean | null
          is_client?: boolean
          is_supplier?: boolean
          legal_name?: string | null
          missing_fields_json?: Json | null
          name: string
          nf_email?: string | null
          payment_ready?: boolean | null
          payment_terms_payable?: number | null
          payment_terms_receivable?: number | null
          person_type?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          supplier_notes?: string | null
          trade_name?: string | null
          type?: Database["public"]["Enums"]["counterparty_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          bank_account?: string | null
          bank_account_digit?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_agency_digit?: string | null
          bank_code?: string | null
          bank_name?: string | null
          client_notes?: string | null
          collection_ready?: boolean | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_limit?: number | null
          delivery_address_city?: string | null
          delivery_address_complement?: string | null
          delivery_address_neighborhood?: string | null
          delivery_address_number?: string | null
          delivery_address_state?: string | null
          delivery_address_street?: string | null
          delivery_address_zip?: string | null
          delivery_same_as_billing?: boolean | null
          document?: string | null
          email?: string | null
          finance_contact_email?: string | null
          finance_contact_name?: string | null
          finance_contact_phone?: string | null
          fiscal_ready?: boolean | null
          id?: string
          ie?: string | null
          ie_is_exempt?: boolean | null
          im?: string | null
          is_active?: boolean | null
          is_client?: boolean
          is_supplier?: boolean
          legal_name?: string | null
          missing_fields_json?: Json | null
          name?: string
          nf_email?: string | null
          payment_ready?: boolean | null
          payment_terms_payable?: number | null
          payment_terms_receivable?: number | null
          person_type?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          supplier_notes?: string | null
          trade_name?: string | null
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
      counterparty_bank_accounts: {
        Row: {
          account_digit: string | null
          account_number: string
          account_type: string | null
          agency: string
          agency_digit: string | null
          bank_code: string
          bank_name: string | null
          company_id: string
          counterparty_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          pix_key: string | null
          pix_key_type: string | null
          updated_at: string | null
        }
        Insert: {
          account_digit?: string | null
          account_number: string
          account_type?: string | null
          agency: string
          agency_digit?: string | null
          bank_code: string
          bank_name?: string | null
          company_id: string
          counterparty_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_digit?: string | null
          account_number?: string
          account_type?: string | null
          agency?: string
          agency_digit?: string | null
          bank_code?: string
          bank_name?: string | null
          company_id?: string
          counterparty_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counterparty_bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparty_bank_accounts_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"] | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"] | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"] | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice_lines: {
        Row: {
          account_id: string
          category_id: string | null
          cost_center_id: string | null
          created_at: string | null
          customer_invoice_id: string
          description: string
          id: string
          line_number: number
          quantity: number | null
          total_amount: number
          unit_price: number
        }
        Insert: {
          account_id: string
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          customer_invoice_id: string
          description: string
          id?: string
          line_number: number
          quantity?: number | null
          total_amount: number
          unit_price: number
        }
        Update: {
          account_id?: string
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          customer_invoice_id?: string
          description?: string
          id?: string
          line_number?: number
          quantity?: number | null
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice_withholdings: {
        Row: {
          amount: number
          base_amount: number
          created_at: string | null
          customer_invoice_id: string
          id: string
          rate: number
          tax_code: string
        }
        Insert: {
          amount: number
          base_amount: number
          created_at?: string | null
          customer_invoice_id: string
          id?: string
          rate: number
          tax_code: string
        }
        Update: {
          amount?: number
          base_amount?: number
          created_at?: string | null
          customer_invoice_id?: string
          id?: string
          rate?: number
          tax_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoice_withholdings_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_withholdings_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoices: {
        Row: {
          attachment_url: string | null
          branch_id: string | null
          collection_notes: string | null
          collection_status: string | null
          company_id: string
          counterparty_id: string
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          document_date: string
          document_number: string
          document_series: string | null
          document_type: string
          due_date: string
          entry_date: string
          fiscal_document_id: string | null
          id: string
          interest_amount: number | null
          last_collection_at: string | null
          net_amount: number
          notes: string | null
          payment_method_id: string | null
          status: string
          total_amount: number
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          branch_id?: string | null
          collection_notes?: string | null
          collection_status?: string | null
          company_id: string
          counterparty_id: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          document_date: string
          document_number: string
          document_series?: string | null
          document_type: string
          due_date: string
          entry_date?: string
          fiscal_document_id?: string | null
          id?: string
          interest_amount?: number | null
          last_collection_at?: string | null
          net_amount: number
          notes?: string | null
          payment_method_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          branch_id?: string | null
          collection_notes?: string | null
          collection_status?: string | null
          company_id?: string
          counterparty_id?: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          document_date?: string
          document_number?: string
          document_series?: string | null
          document_type?: string
          due_date?: string
          entry_date?: string
          fiscal_document_id?: string | null
          id?: string
          interest_amount?: number | null
          last_collection_at?: string | null
          net_amount?: number
          notes?: string | null
          payment_method_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "customer_invoices_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          action: string | null
          company_id: string
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          retention_days: number | null
          updated_at: string | null
        }
        Insert: {
          action?: string | null
          company_id: string
          created_at?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          retention_days?: number | null
          updated_at?: string | null
        }
        Update: {
          action?: string | null
          company_id?: string
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          retention_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_values: {
        Row: {
          code: string
          company_id: string
          created_at: string | null
          dimension_id: string
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string | null
          dimension_id: string
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string | null
          dimension_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dimension_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimension_values_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimension_values_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensions: {
        Row: {
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dimensions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      export_profiles: {
        Row: {
          columns_json: Json
          company_id: string
          created_at: string | null
          filters_json: Json | null
          format: string | null
          id: string
          is_active: boolean | null
          name: string
          report_type: string
          updated_at: string | null
        }
        Insert: {
          columns_json?: Json
          company_id: string
          created_at?: string | null
          filters_json?: Json | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          report_type: string
          updated_at?: string | null
        }
        Update: {
          columns_json?: Json
          company_id?: string
          created_at?: string | null
          filters_json?: Json | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          report_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_profiles_company_id_fkey"
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
      field_visibility_policies: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          mask_bank_accounts: boolean | null
          mask_documents: boolean | null
          mask_in_exports: boolean | null
          updated_at: string | null
          visible_roles_json: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          mask_bank_accounts?: boolean | null
          mask_documents?: boolean | null
          mask_in_exports?: boolean | null
          updated_at?: string | null
          visible_roles_json?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          mask_bank_accounts?: boolean | null
          mask_documents?: boolean | null
          mask_in_exports?: boolean | null
          updated_at?: string | null
          visible_roles_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "field_visibility_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_document_lines: {
        Row: {
          cfop: string | null
          cofins_amount: number | null
          cofins_base: number | null
          cofins_rate: number | null
          created_at: string | null
          fiscal_document_id: string
          icms_amount: number | null
          icms_base: number | null
          icms_rate: number | null
          id: string
          ipi_amount: number | null
          ipi_base: number | null
          ipi_rate: number | null
          iss_amount: number | null
          iss_base: number | null
          iss_rate: number | null
          line_number: number
          ncm: string | null
          pis_amount: number | null
          pis_base: number | null
          pis_rate: number | null
          product_code: string | null
          product_description: string
          quantity: number
          total_amount: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          cfop?: string | null
          cofins_amount?: number | null
          cofins_base?: number | null
          cofins_rate?: number | null
          created_at?: string | null
          fiscal_document_id: string
          icms_amount?: number | null
          icms_base?: number | null
          icms_rate?: number | null
          id?: string
          ipi_amount?: number | null
          ipi_base?: number | null
          ipi_rate?: number | null
          iss_amount?: number | null
          iss_base?: number | null
          iss_rate?: number | null
          line_number: number
          ncm?: string | null
          pis_amount?: number | null
          pis_base?: number | null
          pis_rate?: number | null
          product_code?: string | null
          product_description: string
          quantity: number
          total_amount: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          cfop?: string | null
          cofins_amount?: number | null
          cofins_base?: number | null
          cofins_rate?: number | null
          created_at?: string | null
          fiscal_document_id?: string
          icms_amount?: number | null
          icms_base?: number | null
          icms_rate?: number | null
          id?: string
          ipi_amount?: number | null
          ipi_base?: number | null
          ipi_rate?: number | null
          iss_amount?: number | null
          iss_base?: number | null
          iss_rate?: number | null
          line_number?: number
          ncm?: string | null
          pis_amount?: number | null
          pis_base?: number | null
          pis_rate?: number | null
          product_code?: string | null
          product_description?: string
          quantity?: number
          total_amount?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_document_lines_fiscal_document_id_fkey"
            columns: ["fiscal_document_id"]
            isOneToOne: false
            referencedRelation: "fiscal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_documents: {
        Row: {
          access_key: string | null
          branch_id: string | null
          company_id: string
          counterparty_id: string | null
          created_at: string | null
          document_model: string
          document_number: string
          document_series: string | null
          id: string
          issue_date: string
          notes: string | null
          operation_type: string
          pdf_url: string | null
          status: string | null
          total_cofins: number | null
          total_csll: number | null
          total_discount: number | null
          total_freight: number | null
          total_icms: number | null
          total_icms_st: number | null
          total_inss: number | null
          total_insurance: number | null
          total_ipi: number | null
          total_ir: number | null
          total_iss: number | null
          total_nf: number
          total_other: number | null
          total_pis: number | null
          total_products: number | null
          total_services: number | null
          updated_at: string | null
          xml_content: string | null
        }
        Insert: {
          access_key?: string | null
          branch_id?: string | null
          company_id: string
          counterparty_id?: string | null
          created_at?: string | null
          document_model: string
          document_number: string
          document_series?: string | null
          id?: string
          issue_date: string
          notes?: string | null
          operation_type: string
          pdf_url?: string | null
          status?: string | null
          total_cofins?: number | null
          total_csll?: number | null
          total_discount?: number | null
          total_freight?: number | null
          total_icms?: number | null
          total_icms_st?: number | null
          total_inss?: number | null
          total_insurance?: number | null
          total_ipi?: number | null
          total_ir?: number | null
          total_iss?: number | null
          total_nf: number
          total_other?: number | null
          total_pis?: number | null
          total_products?: number | null
          total_services?: number | null
          updated_at?: string | null
          xml_content?: string | null
        }
        Update: {
          access_key?: string | null
          branch_id?: string | null
          company_id?: string
          counterparty_id?: string | null
          created_at?: string | null
          document_model?: string
          document_number?: string
          document_series?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          operation_type?: string
          pdf_url?: string | null
          status?: string | null
          total_cofins?: number | null
          total_csll?: number | null
          total_discount?: number | null
          total_freight?: number | null
          total_icms?: number | null
          total_icms_st?: number | null
          total_inss?: number | null
          total_insurance?: number | null
          total_ipi?: number | null
          total_ir?: number | null
          total_iss?: number | null
          total_nf?: number
          total_other?: number | null
          total_pis?: number | null
          total_products?: number | null
          total_services?: number | null
          updated_at?: string | null
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
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
            foreignKeyName: "installment_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
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
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
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
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
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
      integration_connections: {
        Row: {
          company_id: string
          created_at: string
          encrypted_credentials: string | null
          encryption_meta: Json | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          name: string
          settings_json: Json | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          encrypted_credentials?: string | null
          encryption_meta?: Json | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          name: string
          settings_json?: Json | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          encrypted_credentials?: string | null
          encryption_meta?: Json | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          name?: string
          settings_json?: Json | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          encrypted_payload: string
          encryption_meta: Json | null
          id: string
          integration_key: string
          last_used_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          encrypted_payload: string
          encryption_meta?: Json | null
          id?: string
          integration_key: string
          last_used_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          encrypted_payload?: string
          encryption_meta?: Json | null
          id?: string
          integration_key?: string
          last_used_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_dlq: {
        Row: {
          attempts: number
          company_id: string
          connection_id: string | null
          created_at: string
          error_json: Json | null
          event_type: string | null
          failed_at: string
          id: string
          notes: string | null
          payload_json: Json
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          attempts?: number
          company_id: string
          connection_id?: string | null
          created_at?: string
          error_json?: Json | null
          event_type?: string | null
          failed_at?: string
          id?: string
          notes?: string | null
          payload_json: Json
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          attempts?: number
          company_id?: string
          connection_id?: string | null
          created_at?: string
          error_json?: Json | null
          event_type?: string | null
          failed_at?: string
          id?: string
          notes?: string | null
          payload_json?: Json
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_dlq_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_dlq_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_jobs: {
        Row: {
          attempts: number
          company_id: string
          completed_at: string | null
          connection_id: string
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          payload_json: Json | null
          result_json: Json | null
          scheduled_at: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          company_id: string
          completed_at?: string | null
          connection_id: string
          created_at?: string
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          payload_json?: Json | null
          result_json?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          company_id?: string
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          payload_json?: Json | null
          result_json?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          company_id: string
          connection_id: string | null
          created_at: string
          direction: string
          duration_ms: number | null
          endpoint: string
          error_message: string | null
          id: string
          method: string | null
          request_meta_json: Json | null
          response_meta_json: Json | null
          status_code: number | null
        }
        Insert: {
          company_id: string
          connection_id?: string | null
          created_at?: string
          direction: string
          duration_ms?: number | null
          endpoint: string
          error_message?: string | null
          id?: string
          method?: string | null
          request_meta_json?: Json | null
          response_meta_json?: Json | null
          status_code?: number | null
        }
        Update: {
          company_id?: string
          connection_id?: string | null
          created_at?: string
          direction?: string
          duration_ms?: number | null
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string | null
          request_meta_json?: Json | null
          response_meta_json?: Json | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhooks: {
        Row: {
          company_id: string
          connection_id: string
          created_at: string
          endpoint_url: string
          event_key: string
          id: string
          is_active: boolean
          secret_hash: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          connection_id: string
          created_at?: string
          endpoint_url: string
          event_key: string
          id?: string
          is_active?: boolean
          secret_hash?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          connection_id?: string
          created_at?: string
          endpoint_url?: string
          event_key?: string
          id?: string
          is_active?: boolean
          secret_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhooks_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
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
      jobs_queue: {
        Row: {
          attempts: number | null
          company_id: string
          created_at: string | null
          error_json: Json | null
          finished_at: string | null
          id: string
          job_type: string
          max_attempts: number | null
          payload_json: Json
          priority: number | null
          result_json: Json | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          company_id: string
          created_at?: string | null
          error_json?: Json | null
          finished_at?: string | null
          id?: string
          job_type: string
          max_attempts?: number | null
          payload_json?: Json
          priority?: number | null
          result_json?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          company_id?: string
          created_at?: string | null
          error_json?: Json | null
          finished_at?: string | null
          id?: string
          job_type?: string
          max_attempts?: number | null
          payload_json?: Json
          priority?: number | null
          result_json?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          id: string
          notes: string | null
          period_id: string | null
          posting_date: string
          reversal_of: string | null
          reversed_by: string | null
          source_id: string | null
          source_type: string
          status: string | null
          total_credit: number
          total_debit: number
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          entry_date: string
          entry_number: string
          id?: string
          notes?: string | null
          period_id?: string | null
          posting_date: string
          reversal_of?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type: string
          status?: string | null
          total_credit: number
          total_debit: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          notes?: string | null
          period_id?: string | null
          posting_date?: string
          reversal_of?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string
          status?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          cost_center_id: string | null
          counterparty_id: string | null
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          document_number: string | null
          id: string
          journal_entry_id: string
          line_number: number
        }
        Insert: {
          account_id: string
          cost_center_id?: string | null
          counterparty_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          document_number?: string | null
          id?: string
          journal_entry_id: string
          line_number: number
        }
        Update: {
          account_id?: string
          cost_center_id?: string | null
          counterparty_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          document_number?: string | null
          id?: string
          journal_entry_id?: string
          line_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "journal_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
      payment_run_items: {
        Row: {
          amount: number
          created_at: string | null
          error_message: string | null
          id: string
          payment_run_id: string
          status: string | null
          vendor_bill_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          payment_run_id: string
          status?: string | null
          vendor_bill_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          payment_run_id?: string
          status?: string | null
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_run_items_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "payment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_run_items_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "v_ap_aging"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_run_items_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cnab_file_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          item_count: number
          notes: string | null
          run_date: string
          run_number: string
          status: string | null
          total_amount: number
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cnab_file_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_count: number
          notes?: string | null
          run_date?: string
          run_number: string
          status?: string | null
          total_amount: number
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cnab_file_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_count?: number
          notes?: string | null
          run_date?: string
          run_number?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_runs_cnab_file_id_fkey"
            columns: ["cnab_file_id"]
            isOneToOne: false
            referencedRelation: "cnab_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_runs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "payment_runs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          id: string
          interest_amount: number | null
          net_amount: number
          notes: string | null
          payment_date: string
          payment_method_id: string | null
          reference_number: string | null
          transaction_id: string | null
          vendor_bill_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          id?: string
          interest_amount?: number | null
          net_amount: number
          notes?: string | null
          payment_date: string
          payment_method_id?: string | null
          reference_number?: string | null
          transaction_id?: string | null
          vendor_bill_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          id?: string
          interest_amount?: number | null
          net_amount?: number
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
          reference_number?: string | null
          transaction_id?: string | null
          vendor_bill_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ap_open"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ar_open"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "v_ap_aging"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "payments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      period_locks: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          module: string
          period_id: string
          unlock_reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          module: string
          period_id: string
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          module?: string
          period_id?: string
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_locks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_locks_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string | null
          end_date: string
          id: string
          is_open: boolean | null
          month: number
          start_date: string
          updated_at: string | null
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          created_at?: string | null
          end_date: string
          id?: string
          is_open?: boolean | null
          month: number
          start_date: string
          updated_at?: string | null
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          is_open?: boolean | null
          month?: number
          start_date?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      posting_rules: {
        Row: {
          company_id: string
          created_at: string | null
          credit_account_id: string
          debit_account_id: string
          description_template: string | null
          id: string
          is_active: boolean | null
          name: string
          source_type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          credit_account_id: string
          debit_account_id: string
          description_template?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          source_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          credit_account_id?: string
          debit_account_id?: string
          description_template?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          source_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posting_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_rules_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_rules_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "posting_rules_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "posting_rules_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_rules_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "posting_rules_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requester_email: string
          status: string | null
          target_user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          requester_email: string
          status?: string | null
          target_user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requester_email?: string
          status?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "privacy_requests_company_id_fkey"
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
      receipts: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          created_by: string | null
          customer_invoice_id: string | null
          discount_amount: number | null
          id: string
          interest_amount: number | null
          net_amount: number
          notes: string | null
          payment_method_id: string | null
          receipt_date: string
          reference_number: string | null
          transaction_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          customer_invoice_id?: string | null
          discount_amount?: number | null
          id?: string
          interest_amount?: number | null
          net_amount: number
          notes?: string | null
          payment_method_id?: string | null
          receipt_date: string
          reference_number?: string | null
          transaction_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_invoice_id?: string | null
          discount_amount?: number | null
          id?: string
          interest_amount?: number | null
          net_amount?: number
          notes?: string | null
          payment_method_id?: string | null
          receipt_date?: string
          reference_number?: string | null
          transaction_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ap_open"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ar_open"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "receipts_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      received_files: {
        Row: {
          company_id: string
          created_at: string | null
          error_message: string | null
          file_type: string | null
          id: string
          inbox_id: string | null
          meta_json: Json | null
          mime_type: string | null
          original_filename: string | null
          parsed_at: string | null
          parsed_status: string | null
          sha256: string | null
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          error_message?: string | null
          file_type?: string | null
          id?: string
          inbox_id?: string | null
          meta_json?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          parsed_at?: string | null
          parsed_status?: string | null
          sha256?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          file_type?: string | null
          id?: string
          inbox_id?: string | null
          meta_json?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          parsed_at?: string | null
          parsed_status?: string | null
          sha256?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "received_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      reconciliation_suggestions: {
        Row: {
          candidate_id: string
          candidate_type: string
          company_id: string
          created_at: string | null
          differences_json: Json | null
          id: string
          import_id: string | null
          is_selected: boolean | null
          match_reasons_json: Json | null
          rule_id: string | null
          score: number | null
          statement_line_id: string
        }
        Insert: {
          candidate_id: string
          candidate_type: string
          company_id: string
          created_at?: string | null
          differences_json?: Json | null
          id?: string
          import_id?: string | null
          is_selected?: boolean | null
          match_reasons_json?: Json | null
          rule_id?: string | null
          score?: number | null
          statement_line_id: string
        }
        Update: {
          candidate_id?: string
          candidate_type?: string
          company_id?: string
          created_at?: string | null
          differences_json?: Json | null
          id?: string
          import_id?: string | null
          is_selected?: boolean | null
          match_reasons_json?: Json | null
          rule_id?: string | null
          score?: number | null
          statement_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          granted: boolean | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          filter_type: string
          filters_json: Json
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          filter_type?: string
          filters_json?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          filter_type?: string
          filters_json?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sod_exceptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          policy_id: string
          reason: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          policy_id: string
          reason: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          policy_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sod_exceptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sod_exceptions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sod_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      sod_policies: {
        Row: {
          company_id: string
          conflicts_json: Json
          created_at: string | null
          description: string | null
          enforcement: string | null
          id: string
          is_active: boolean | null
          policy_key: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          conflicts_json?: Json
          created_at?: string | null
          description?: string | null
          enforcement?: string | null
          id?: string
          is_active?: boolean | null
          policy_key: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          conflicts_json?: Json
          created_at?: string | null
          description?: string | null
          enforcement?: string | null
          id?: string
          is_active?: boolean | null
          policy_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sod_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subledger_links: {
        Row: {
          created_at: string | null
          id: string
          journal_entry_id: string
          source_id: string
          source_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          journal_entry_id: string
          source_id: string
          source_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          journal_entry_id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subledger_links_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_snapshots: {
        Row: {
          ai_metrics_json: Json | null
          company_id: string
          created_at: string | null
          id: string
          integrations_status_json: Json | null
          jobs_summary_json: Json | null
          pending_items_count: number | null
          snapshot_at: string | null
        }
        Insert: {
          ai_metrics_json?: Json | null
          company_id: string
          created_at?: string | null
          id?: string
          integrations_status_json?: Json | null
          jobs_summary_json?: Json | null
          pending_items_count?: number | null
          snapshot_at?: string | null
        }
        Update: {
          ai_metrics_json?: Json | null
          company_id?: string
          created_at?: string | null
          id?: string
          integrations_status_json?: Json | null
          jobs_summary_json?: Json | null
          pending_items_count?: number | null
          snapshot_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_health_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_calculations: {
        Row: {
          amount: number
          base_amount: number
          company_id: string
          created_at: string | null
          due_date: string | null
          id: string
          is_withholding: boolean | null
          paid_date: string | null
          period_id: string | null
          rate: number | null
          source_id: string | null
          source_type: string | null
          tax_type: string
        }
        Insert: {
          amount: number
          base_amount: number
          company_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_withholding?: boolean | null
          paid_date?: string | null
          period_id?: string | null
          rate?: number | null
          source_id?: string | null
          source_type?: string | null
          tax_type: string
        }
        Update: {
          amount?: number
          base_amount?: number
          company_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_withholding?: boolean | null
          paid_date?: string | null
          period_id?: string | null
          rate?: number | null
          source_id?: string | null
          source_type?: string | null
          tax_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_calculations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_codes: {
        Row: {
          calculation_base: string | null
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_withholding: boolean | null
          name: string
          rate: number
          tax_type: string
          updated_at: string | null
        }
        Insert: {
          calculation_base?: string | null
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_withholding?: boolean | null
          name: string
          rate: number
          tax_type: string
          updated_at?: string | null
        }
        Update: {
          calculation_base?: string | null
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_withholding?: boolean | null
          name?: string
          rate?: number
          tax_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_reports: {
        Row: {
          company_id: string
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          period_id: string
          report_type: string
          total_base: number
          total_due: number
          total_tax: number
          total_withheld: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          period_id: string
          report_type: string
          total_base: number
          total_due: number
          total_tax: number
          total_withheld?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          period_id?: string
          report_type?: string
          total_base?: number
          total_due?: number
          total_tax?: number
          total_withheld?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_reports_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rules: {
        Row: {
          cfop_pattern: string | null
          city_code: string | null
          company_id: string
          counterparty_type: string | null
          created_at: string | null
          document_type: string | null
          id: string
          is_active: boolean | null
          operation_type: string | null
          priority: number | null
          state_destination: string | null
          state_origin: string | null
          tax_code_id: string
        }
        Insert: {
          cfop_pattern?: string | null
          city_code?: string | null
          company_id: string
          counterparty_type?: string | null
          created_at?: string | null
          document_type?: string | null
          id?: string
          is_active?: boolean | null
          operation_type?: string | null
          priority?: number | null
          state_destination?: string | null
          state_origin?: string | null
          tax_code_id: string
        }
        Update: {
          cfop_pattern?: string | null
          city_code?: string | null
          company_id?: string
          counterparty_type?: string | null
          created_at?: string | null
          document_type?: string | null
          id?: string
          is_active?: boolean | null
          operation_type?: string | null
          priority?: number | null
          state_destination?: string | null
          state_origin?: string | null
          tax_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rules_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_dimensions: {
        Row: {
          created_at: string | null
          dimension_id: string
          dimension_value_id: string
          id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          dimension_id: string
          dimension_value_id: string
          id?: string
          transaction_id: string
        }
        Update: {
          created_at?: string | null
          dimension_id?: string
          dimension_value_id?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_dimensions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_dimensions_dimension_value_id_fkey"
            columns: ["dimension_value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_dimensions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_dimensions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_ap_open"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_dimensions_transaction_id_fkey"
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
          category_id: string | null
          company_id: string
          cost_center_id: string | null
          counterparty_id: string | null
          created_at: string | null
          description: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          discount_amount: number | null
          discount_percent: number | null
          document_number: string | null
          document_series: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
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
          category_id?: string | null
          company_id: string
          cost_center_id?: string | null
          counterparty_id?: string | null
          created_at?: string | null
          description: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          discount_amount?: number | null
          discount_percent?: number | null
          document_number?: string | null
          document_series?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
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
          category_id?: string | null
          company_id?: string
          cost_center_id?: string | null
          counterparty_id?: string | null
          created_at?: string | null
          description?: string
          direction?: Database["public"]["Enums"]["transaction_direction"]
          discount_amount?: number | null
          discount_percent?: number | null
          document_number?: string | null
          document_series?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
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
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
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
            foreignKeyName: "transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
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
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
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
      user_branch_access: {
        Row: {
          access_level: string | null
          branch_id: string
          company_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          branch_id: string
          company_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          branch_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_limits: {
        Row: {
          approve_limit_amount: number | null
          company_id: string
          created_at: string | null
          daily_limit_amount: number | null
          execute_limit_amount: number | null
          id: string
          limit_by_branch_json: Json | null
          limit_by_category_json: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approve_limit_amount?: number | null
          company_id: string
          created_at?: string | null
          daily_limit_amount?: number | null
          execute_limit_amount?: number | null
          id?: string
          limit_by_branch_json?: Json | null
          limit_by_category_json?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approve_limit_amount?: number | null
          company_id?: string
          created_at?: string | null
          daily_limit_amount?: number | null
          execute_limit_amount?: number | null
          id?: string
          limit_by_branch_json?: Json | null
          limit_by_category_json?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_limits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          company_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bill_lines: {
        Row: {
          account_id: string
          category_id: string | null
          cost_center_id: string | null
          created_at: string | null
          description: string
          id: string
          line_number: number
          quantity: number | null
          total_amount: number
          unit_price: number
          vendor_bill_id: string
        }
        Insert: {
          account_id: string
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          line_number: number
          quantity?: number | null
          total_amount: number
          unit_price: number
          vendor_bill_id: string
        }
        Update: {
          account_id?: string
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          line_number?: number
          quantity?: number | null
          total_amount?: number
          unit_price?: number
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "v_ap_aging"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bill_withholdings: {
        Row: {
          amount: number
          base_amount: number
          created_at: string | null
          due_date: string | null
          id: string
          rate: number
          tax_code: string
          vendor_bill_id: string
        }
        Insert: {
          amount: number
          base_amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          rate: number
          tax_code: string
          vendor_bill_id: string
        }
        Update: {
          amount?: number
          base_amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          rate?: number
          tax_code?: string
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bill_withholdings_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "v_ap_aging"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_withholdings_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bills: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          branch_id: string | null
          company_id: string
          counterparty_id: string
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          document_date: string
          document_number: string
          document_series: string | null
          document_type: string
          due_date: string
          entry_date: string
          fiscal_document_id: string | null
          id: string
          interest_amount: number | null
          net_amount: number
          notes: string | null
          payment_method_id: string | null
          requires_approval: boolean | null
          status: string
          total_amount: number
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          branch_id?: string | null
          company_id: string
          counterparty_id: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          document_date: string
          document_number: string
          document_series?: string | null
          document_type: string
          due_date: string
          entry_date?: string
          fiscal_document_id?: string | null
          id?: string
          interest_amount?: number | null
          net_amount: number
          notes?: string | null
          payment_method_id?: string | null
          requires_approval?: boolean | null
          status?: string
          total_amount: number
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          branch_id?: string | null
          company_id?: string
          counterparty_id?: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          document_date?: string
          document_number?: string
          document_series?: string | null
          document_type?: string
          due_date?: string
          entry_date?: string
          fiscal_document_id?: string | null
          id?: string
          interest_amount?: number | null
          net_amount?: number
          notes?: string | null
          payment_method_id?: string | null
          requires_approval?: boolean | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "vendor_bills_wallet_id_fkey"
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
      whatsapp_connections: {
        Row: {
          company_id: string
          created_at: string | null
          credentials_encrypted: string | null
          id: string
          phone_number: string | null
          provider: string
          settings_json: Json | null
          status: string
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          credentials_encrypted?: string | null
          id?: string
          phone_number?: string | null
          provider: string
          settings_json?: Json | null
          status?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          credentials_encrypted?: string | null
          id?: string
          phone_number?: string | null
          provider?: string
          settings_json?: Json | null
          status?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          company_id: string
          created_at: string | null
          daily_limits_json: Json | null
          display_name: string | null
          id: string
          is_allowed: boolean | null
          is_blocked: boolean | null
          last_activity_at: string | null
          phone_e164: string
          pin_hash: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          daily_limits_json?: Json | null
          display_name?: string | null
          id?: string
          is_allowed?: boolean | null
          is_blocked?: boolean | null
          last_activity_at?: string | null
          phone_e164: string
          pin_hash?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          daily_limits_json?: Json | null
          display_name?: string | null
          id?: string
          is_allowed?: boolean | null
          is_blocked?: boolean | null
          last_activity_at?: string | null
          phone_e164?: string
          pin_hash?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_inbox: {
        Row: {
          company_id: string
          connection_id: string | null
          contact_id: string | null
          created_at: string | null
          direction: string | null
          id: string
          media_mime_type: string | null
          media_url: string | null
          msg_type: string
          phone: string
          processed_at: string | null
          provider_msg_id: string | null
          raw_json: Json | null
          received_at: string | null
          status: string | null
          text_body: string | null
        }
        Insert: {
          company_id: string
          connection_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          msg_type: string
          phone: string
          processed_at?: string | null
          provider_msg_id?: string | null
          raw_json?: Json | null
          received_at?: string | null
          status?: string | null
          text_body?: string | null
        }
        Update: {
          company_id?: string
          connection_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          msg_type?: string
          phone?: string
          processed_at?: string | null
          provider_msg_id?: string | null
          raw_json?: Json | null
          received_at?: string | null
          status?: string | null
          text_body?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_inbox_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      withholding_rules: {
        Row: {
          company_id: string
          created_at: string | null
          deduction_amount: number | null
          id: string
          is_active: boolean | null
          minimum_amount: number | null
          rate: number
          service_code: string | null
          tax_type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          deduction_amount?: number | null
          id?: string
          is_active?: boolean | null
          minimum_amount?: number | null
          rate: number
          service_code?: string | null
          tax_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          deduction_amount?: number | null
          id?: string
          is_active?: boolean | null
          minimum_amount?: number | null
          rate?: number
          service_code?: string | null
          tax_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withholding_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_ap_aging: {
        Row: {
          aging_bucket: string | null
          company_id: string | null
          counterparty_name: string | null
          days_overdue: number | null
          document_number: string | null
          due_date: string | null
          id: string | null
          net_amount: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ap_aging_summary: {
        Row: {
          aging_bucket: string | null
          company_id: string | null
          doc_count: number | null
          oldest_date: string | null
          total_amount: number | null
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
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
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
            foreignKeyName: "transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
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
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
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
      v_ar_aging_detail: {
        Row: {
          aging_bucket: string | null
          company_id: string | null
          counterparty_name: string | null
          days_overdue: number | null
          document_number: string | null
          due_date: string | null
          id: string | null
          net_amount: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ar_aging_summary: {
        Row: {
          aging_bucket: string | null
          company_id: string | null
          doc_count: number | null
          oldest_date: string | null
          total_amount: number | null
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
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
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
            foreignKeyName: "transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
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
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
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
      v_bank_reconciliation_status: {
        Row: {
          company_id: string | null
          pending_amount: number | null
          reconciled_lines: number | null
          reconciled_percent: number | null
          statement_date: string | null
          total_lines: number | null
          wallet_id: string | null
          wallet_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "bank_statements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_vs_actual_monthly: {
        Row: {
          actual_expense: number | null
          actual_margin: number | null
          actual_profit: number | null
          actual_revenue: number | null
          company_id: string | null
          expense_variance: number | null
          expense_variance_pct: number | null
          month: number | null
          profit_variance: number | null
          revenue_variance: number | null
          revenue_variance_pct: number | null
          target_expense: number | null
          target_margin: number | null
          target_profit: number | null
          target_revenue: number | null
          year: number | null
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
      v_cash_daily_balance: {
        Row: {
          closing_balance: number | null
          company_id: string | null
          inflows: number | null
          movement_date: string | null
          net: number | null
          outflows: number | null
          wallet_id: string | null
          wallet_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position_daily"
            referencedColumns: ["wallet_id"]
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
      v_cash_position_daily: {
        Row: {
          company_id: string | null
          current_balance: number | null
          opening_balance: number | null
          total_inflows: number | null
          total_outflows: number | null
          wallet_id: string | null
          wallet_name: string | null
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
      v_cashflow_projection_daily: {
        Row: {
          company_id: string | null
          inflows: number | null
          net: number | null
          outflows: number | null
          projected_balance: number | null
          projection_date: string | null
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
      v_cashflow_weekly_projection: {
        Row: {
          company_id: string | null
          inflows: number | null
          net: number | null
          outflows: number | null
          projected_balance: number | null
          week_number: number | null
          week_start: string | null
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
      v_cost_center_tree: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          children_count: number | null
          code: string | null
          company_id: string | null
          id: string | null
          is_active: boolean | null
          is_leaf: boolean | null
          level: number | null
          level_label: string | null
          level_type: string | null
          manager_user_id: string | null
          name: string | null
          parent_id: string | null
          path: string | null
          path_codes: string | null
          tags_json: Json | null
          valid_from: string | null
          valid_to: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_cost_center_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dpo_monthly: {
        Row: {
          company_id: string | null
          dpo_days: number | null
          month: number | null
          total_payments: number | null
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
      v_dso_monthly: {
        Row: {
          company_id: string | null
          dso_days: number | null
          month: number | null
          total_sales: number | null
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
      v_ledger: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          company_id: string | null
          counterparty_name: string | null
          credit_amount: number | null
          debit_amount: number | null
          document_number: string | null
          entry_date: string | null
          entry_description: string | null
          entry_number: string | null
          line_description: string | null
          source_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_rc_flow_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_trial_balance"
            referencedColumns: ["account_id"]
          },
        ]
      }
      v_pending_approvals: {
        Row: {
          amount: number | null
          company_id: string | null
          current_step: number | null
          document_reference: string | null
          entity_id: string | null
          entity_type: string | null
          request_id: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          amount?: never
          company_id?: string | null
          current_step?: number | null
          document_reference?: never
          entity_id?: string | null
          entity_type?: string | null
          request_id?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: never
          company_id?: string | null
          current_step?: number | null
          document_reference?: never
          entity_id?: string | null
          entity_type?: string | null
          request_id?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_company_id_fkey"
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
      v_top_creditors: {
        Row: {
          company_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          doc_count: number | null
          max_days_overdue: number | null
          oldest_due_date: string | null
          total_open: number | null
          total_overdue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      v_top_debtors: {
        Row: {
          company_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          doc_count: number | null
          max_days_overdue: number | null
          oldest_due_date: string | null
          total_open: number | null
          total_overdue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trial_balance: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          balance: number | null
          category_type: Database["public"]["Enums"]["account_category"] | null
          company_id: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_withholding_summary: {
        Row: {
          company_id: string | null
          month: number | null
          tax_type: string | null
          total_base: number | null
          total_withheld: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_calculations_company_id_fkey"
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
      user_has_permission: {
        Args: {
          p_company_id: string
          p_permission_code: string
          p_user_id: string
        }
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
      app_role: "admin" | "gestor" | "operador" | "visualizador" | "auditor"
      counterparty_type: "cliente" | "fornecedor" | "ambos"
      document_type: "nf" | "nfe" | "fatura" | "recibo" | "boleto" | "outro"
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
        | "account_categories"
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
      app_role: ["admin", "gestor", "operador", "visualizador", "auditor"],
      counterparty_type: ["cliente", "fornecedor", "ambos"],
      document_type: ["nf", "nfe", "fatura", "recibo", "boleto", "outro"],
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
        "account_categories",
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
