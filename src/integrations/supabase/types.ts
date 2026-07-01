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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coaching_analyses: {
        Row: {
          analysis: Json
          created_at: string
          engine_version: number
          id: string
          match_id: string
          overall_score: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          analysis: Json
          created_at?: string
          engine_version?: number
          id?: string
          match_id: string
          overall_score?: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          analysis?: Json
          created_at?: string
          engine_version?: number
          id?: string
          match_id?: string
          overall_score?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          assists: number
          champion_id: number | null
          champion_name: string
          created_at: string
          cs: number
          deaths: number
          game_creation: string | null
          game_duration: number
          gold: number
          id: string
          kills: number
          match_id: string
          profile_id: string
          puuid: string
          queue_id: number | null
          queue_label: string | null
          raw: Json | null
          team_position: string | null
          timeline: Json | null
          timeline_fetched: boolean
          updated_at: string
          vision_score: number | null
          win: boolean
        }
        Insert: {
          assists?: number
          champion_id?: number | null
          champion_name: string
          created_at?: string
          cs?: number
          deaths?: number
          game_creation?: string | null
          game_duration?: number
          gold?: number
          id?: string
          kills?: number
          match_id: string
          profile_id: string
          puuid: string
          queue_id?: number | null
          queue_label?: string | null
          raw?: Json | null
          team_position?: string | null
          timeline?: Json | null
          timeline_fetched?: boolean
          updated_at?: string
          vision_score?: number | null
          win?: boolean
        }
        Update: {
          assists?: number
          champion_id?: number | null
          champion_name?: string
          created_at?: string
          cs?: number
          deaths?: number
          game_creation?: string | null
          game_duration?: number
          gold?: number
          id?: string
          kills?: number
          match_id?: string
          profile_id?: string
          puuid?: string
          queue_id?: number | null
          queue_label?: string | null
          raw?: Json | null
          team_position?: string | null
          timeline?: Json | null
          timeline_fetched?: boolean
          updated_at?: string
          vision_score?: number | null
          win?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_rank: string | null
          display_name: string | null
          email: string | null
          id: string
          onboarding_complete: boolean
          onboarding_completed: boolean
          preferred_role: string | null
          profile_picture: string | null
          riot_connected: boolean
          subscription_tier: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_rank?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          onboarding_complete?: boolean
          onboarding_completed?: boolean
          preferred_role?: string | null
          profile_picture?: string | null
          riot_connected?: boolean
          subscription_tier?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_rank?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          onboarding_complete?: boolean
          onboarding_completed?: boolean
          preferred_role?: string | null
          profile_picture?: string | null
          riot_connected?: boolean
          subscription_tier?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      riot_accounts: {
        Row: {
          account_id: string | null
          created_at: string
          game_name: string
          id: string
          last_sync: string | null
          linked_at: string
          profile_icon_id: number | null
          profile_id: string
          puuid: string | null
          region: string
          summoner_id: string | null
          summoner_level: number | null
          tag_line: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          game_name: string
          id?: string
          last_sync?: string | null
          linked_at?: string
          profile_icon_id?: number | null
          profile_id: string
          puuid?: string | null
          region: string
          summoner_id?: string | null
          summoner_level?: number | null
          tag_line: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          game_name?: string
          id?: string
          last_sync?: string | null
          linked_at?: string
          profile_icon_id?: number | null
          profile_id?: string
          puuid?: string | null
          region?: string
          summoner_id?: string | null
          summoner_level?: number | null
          tag_line?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "riot_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
