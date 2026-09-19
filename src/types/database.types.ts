export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      flashcards: {
        Row: {
          created_at: string
          english: string
          example: string | null
          id: string
          last_reviewed_at: string | null
          left_count: number
          notes: string | null
          phonetic: string | null
          portuguese: string
          right_count: number
          seen_count: number
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          english: string
          example?: string | null
          id?: string
          last_reviewed_at?: string | null
          left_count?: number
          notes?: string | null
          phonetic?: string | null
          portuguese: string
          right_count?: number
          seen_count?: number
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          english?: string
          example?: string | null
          id?: string
          last_reviewed_at?: string | null
          left_count?: number
          notes?: string | null
          phonetic?: string | null
          portuguese?: string
          right_count?: number
          seen_count?: number
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      review_events: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["swipe_direction"]
          flashcard_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["swipe_direction"]
          flashcard_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["swipe_direction"]
          flashcard_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_events_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_flashcard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      flashcard_weight: {
        Args: { p_left_count: number; p_right_count: number }
        Returns: number
      }
      next_flashcards: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          english: string
          example: string | null
          id: string
          last_reviewed_at: string | null
          left_count: number
          notes: string | null
          phonetic: string | null
          portuguese: string
          right_count: number
          seen_count: number
          tags: string[]
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "flashcards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_swipe: {
        Args: {
          p_direction: Database["public"]["Enums"]["swipe_direction"]
          p_flashcard_id: string
        }
        Returns: {
          created_at: string
          english: string
          example: string | null
          id: string
          last_reviewed_at: string | null
          left_count: number
          notes: string | null
          phonetic: string | null
          portuguese: string
          right_count: number
          seen_count: number
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "flashcards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      swipe_direction: "left" | "right"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      swipe_direction: ["left", "right"],
    },
  },
} as const

