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
      blocked_devices: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          device_hash: string
          id: string
          reason: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          device_hash: string
          id?: string
          reason: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          device_hash?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          client_id: string
          completed_count: number | null
          created_at: string
          id: string
          page_link: string
          payment_confirmed_at: string | null
          plan_name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          platform: Database["public"]["Enums"]["platform_type"]
          price: number
          profile_link: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_count: number
          updated_at: string
          video_link: string | null
        }
        Insert: {
          client_id: string
          completed_count?: number | null
          created_at?: string
          id?: string
          page_link: string
          payment_confirmed_at?: string | null
          plan_name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          platform: Database["public"]["Enums"]["platform_type"]
          price: number
          profile_link?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_count: number
          updated_at?: string
          video_link?: string | null
        }
        Update: {
          client_id?: string
          completed_count?: number | null
          created_at?: string
          id?: string
          page_link?: string
          payment_confirmed_at?: string | null
          plan_name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          platform?: Database["public"]["Enums"]["platform_type"]
          price?: number
          profile_link?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_count?: number
          updated_at?: string
          video_link?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          blocked_reason: string | null
          company_name: string | null
          created_at: string
          device_hash: string | null
          email: string
          facebook_link: string | null
          full_name: string
          id: string
          instagram_link: string | null
          is_blocked: boolean | null
          phone: string
          tiktok_link: string | null
          updated_at: string
          user_id: string
          user_type: string
          withdrawal_details: string | null
          withdrawal_method: string | null
          youtube_link: string | null
        }
        Insert: {
          account_type?: string | null
          blocked_reason?: string | null
          company_name?: string | null
          created_at?: string
          device_hash?: string | null
          email: string
          facebook_link?: string | null
          full_name: string
          id?: string
          instagram_link?: string | null
          is_blocked?: boolean | null
          phone: string
          tiktok_link?: string | null
          updated_at?: string
          user_id: string
          user_type: string
          withdrawal_details?: string | null
          withdrawal_method?: string | null
          youtube_link?: string | null
        }
        Update: {
          account_type?: string | null
          blocked_reason?: string | null
          company_name?: string | null
          created_at?: string
          device_hash?: string | null
          email?: string
          facebook_link?: string | null
          full_name?: string
          id?: string
          instagram_link?: string | null
          is_blocked?: boolean | null
          phone?: string
          tiktok_link?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
          withdrawal_details?: string | null
          withdrawal_method?: string | null
          youtube_link?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_at: string | null
          campaign_id: string
          comment_proof_url: string | null
          completed_at: string | null
          created_at: string
          follow_proof_url: string | null
          id: string
          like_proof_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_amount: number
          share_proof_url: string | null
          status: Database["public"]["Enums"]["task_status"]
          worker_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          campaign_id: string
          comment_proof_url?: string | null
          completed_at?: string | null
          created_at?: string
          follow_proof_url?: string | null
          id?: string
          like_proof_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount: number
          share_proof_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          worker_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          campaign_id?: string
          comment_proof_url?: string | null
          completed_at?: string | null
          created_at?: string
          follow_proof_url?: string | null
          id?: string
          like_proof_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number
          share_proof_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "available_campaigns_for_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          withdrawal_details: string
          withdrawal_method: string
          worker_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          withdrawal_details: string
          withdrawal_method: string
          worker_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          withdrawal_details?: string
          withdrawal_method?: string
          worker_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_campaigns_for_workers: {
        Row: {
          completed_count: number | null
          created_at: string | null
          id: string | null
          page_link: string | null
          plan_name: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          platform: Database["public"]["Enums"]["platform_type"] | null
          profile_link: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          target_count: number | null
          video_link: string | null
        }
        Insert: {
          completed_count?: number | null
          created_at?: string | null
          id?: string | null
          page_link?: string | null
          plan_name?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          profile_link?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_count?: number | null
          video_link?: string | null
        }
        Update: {
          completed_count?: number | null
          created_at?: string | null
          id?: string | null
          page_link?: string | null
          plan_name?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          profile_link?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_count?: number | null
          video_link?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_campaign: {
        Args: { p_campaign_id: string }
        Returns: boolean
      }
      admin_approve_task: { Args: { p_task_id: string }; Returns: boolean }
      admin_approve_withdrawal: {
        Args: { p_withdrawal_id: string }
        Returns: boolean
      }
      admin_reject_campaign: {
        Args: { p_campaign_id: string }
        Returns: boolean
      }
      admin_reject_task: {
        Args: { p_reason: string; p_task_id: string }
        Returns: boolean
      }
      admin_reject_withdrawal: {
        Args: { p_reason: string; p_withdrawal_id: string }
        Returns: boolean
      }
      create_campaign_secure: {
        Args: {
          p_page_link: string
          p_plan_name: string
          p_plan_type: string
          p_platform: string
          p_profile_link?: string
          p_video_link?: string
        }
        Returns: string
      }
      get_user_profile: {
        Args: { _user_id: string }
        Returns: {
          account_type: string | null
          blocked_reason: string | null
          company_name: string | null
          created_at: string
          device_hash: string | null
          email: string
          facebook_link: string | null
          full_name: string
          id: string
          instagram_link: string | null
          is_blocked: boolean | null
          phone: string
          tiktok_link: string | null
          updated_at: string
          user_id: string
          user_type: string
          withdrawal_details: string | null
          withdrawal_method: string | null
          youtube_link: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client" | "worker"
      campaign_status: "pending_payment" | "active" | "completed" | "cancelled"
      plan_type: "ta_no_limao" | "kwanza"
      platform_type: "facebook" | "instagram" | "tiktok" | "youtube"
      task_status:
        | "available"
        | "in_progress"
        | "pending_review"
        | "approved"
        | "rejected"
      withdrawal_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "client", "worker"],
      campaign_status: ["pending_payment", "active", "completed", "cancelled"],
      plan_type: ["ta_no_limao", "kwanza"],
      platform_type: ["facebook", "instagram", "tiktok", "youtube"],
      task_status: [
        "available",
        "in_progress",
        "pending_review",
        "approved",
        "rejected",
      ],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
