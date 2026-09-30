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
      conversations: {
        Row: {
          buyer_id: string
          buyer_last_read_at: string | null
          buyer_name: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          listing_id: string | null
          listing_title: string
          seller_id: string
          seller_last_read_at: string | null
          seller_name: string
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          buyer_last_read_at?: string | null
          buyer_name: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          listing_id?: string | null
          listing_title: string
          seller_id: string
          seller_last_read_at?: string | null
          seller_name: string
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          buyer_last_read_at?: string | null
          buyer_name?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          listing_id?: string | null
          listing_title?: string
          seller_id?: string
          seller_last_read_at?: string | null
          seller_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          deleted_at: string | null
          heart_count: number
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          deleted_at?: string | null
          heart_count?: number
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          heart_count?: number
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_images: {
        Row: {
          created_at: string
          id: string
          position: number
          post_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          post_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          post_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_name: string
          body: string
          category: string
          comment_count: number
          created_at: string
          deleted_at: string | null
          heart_count: number
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          category?: string
          comment_count?: number
          created_at?: string
          deleted_at?: string | null
          heart_count?: number
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          category?: string
          comment_count?: number
          created_at?: string
          deleted_at?: string | null
          heart_count?: number
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      forum_reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          position: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          position?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          lat: number
          lng: number
          location_label: string
          price: number | null
          quantity: number | null
          reserved_at: string | null
          reserved_for: string | null
          reserved_for_name: string | null
          seller_name: string
          sold_at: string | null
          sold_to: string | null
          sold_to_name: string | null
          status: string
          title: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          lat: number
          lng: number
          location_label: string
          price?: number | null
          quantity?: number | null
          reserved_at?: string | null
          reserved_for?: string | null
          reserved_for_name?: string | null
          seller_name: string
          sold_at?: string | null
          sold_to?: string | null
          sold_to_name?: string | null
          status?: string
          title: string
          unit: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          location_label?: string
          price?: number | null
          quantity?: number | null
          reserved_at?: string | null
          reserved_for?: string | null
          reserved_for_name?: string | null
          seller_name?: string
          sold_at?: string | null
          sold_to?: string | null
          sold_to_name?: string | null
          status?: string
          title?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_affiliations: {
        Row: {
          created_at: string
          id: string
          membership_id: string | null
          organization_name: string
          proof_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id?: string | null
          organization_name: string
          proof_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string | null
          organization_name?: string
          proof_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_credentials: {
        Row: {
          certificate_number: string | null
          created_at: string
          credential_type: string
          document_path: string
          id: string
          issuing_organization: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_number?: string | null
          created_at?: string
          credential_type: string
          document_path: string
          id?: string
          issuing_organization: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string | null
          created_at?: string
          credential_type?: string
          document_path?: string
          id?: string
          issuing_organization?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_documents: {
        Row: {
          created_at: string
          document_path: string
          id: string
          label: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_path: string
          id?: string
          label: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_path?: string
          id?: string
          label?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_endorsements: {
        Row: {
          created_at: string
          date_issued: string
          document_path: string
          id: string
          issuing_office: string
          municipality: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_issued: string
          document_path: string
          id?: string
          issuing_office: string
          municipality: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_issued?: string
          document_path?: string
          id?: string
          issuing_office?: string
          municipality?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          barangay: string | null
          created_at: string
          deleted_at: string | null
          farm_size_hectares: number | null
          full_name: string | null
          id: string
          municipality: string | null
          phone: string | null
          province: string | null
          rating_avg: number
          rating_count: number
          rice_varieties: string[]
          rsbsa_document_path: string | null
          rsbsa_number: string | null
          updated_at: string | null
          verification_status: string
          verified_at: string | null
          years_farming_experience: number | null
        }
        Insert: {
          avatar_path?: string | null
          barangay?: string | null
          created_at?: string
          deleted_at?: string | null
          farm_size_hectares?: number | null
          full_name?: string | null
          id: string
          municipality?: string | null
          phone?: string | null
          province?: string | null
          rating_avg?: number
          rating_count?: number
          rice_varieties?: string[]
          rsbsa_document_path?: string | null
          rsbsa_number?: string | null
          updated_at?: string | null
          verification_status?: string
          verified_at?: string | null
          years_farming_experience?: number | null
        }
        Update: {
          avatar_path?: string | null
          barangay?: string | null
          created_at?: string
          deleted_at?: string | null
          farm_size_hectares?: number | null
          full_name?: string | null
          id?: string
          municipality?: string | null
          phone?: string | null
          province?: string | null
          rating_avg?: number
          rating_count?: number
          rice_varieties?: string[]
          rsbsa_document_path?: string | null
          rsbsa_number?: string | null
          updated_at?: string | null
          verification_status?: string
          verified_at?: string | null
          years_farming_experience?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_title: string
          rating: number
          reviewee_id: string
          reviewee_name: string
          reviewer_id: string
          reviewer_name: string
          reviewer_role: string
          transaction_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_title: string
          rating: number
          reviewee_id: string
          reviewee_name: string
          reviewer_id: string
          reviewer_name: string
          reviewer_role: string
          transaction_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_title?: string
          rating?: number
          reviewee_id?: string
          reviewee_name?: string
          reviewer_id?: string
          reviewer_name?: string
          reviewer_role?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          buyer_id: string | null
          buyer_name: string | null
          created_at: string
          id: string
          listing_id: string | null
          listing_title: string
          price: number | null
          reserved_at: string | null
          seller_id: string
          seller_name: string
          sold_at: string | null
          status: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          listing_title: string
          price?: number | null
          reserved_at?: string | null
          seller_id: string
          seller_name: string
          sold_at?: string | null
          status: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          listing_title?: string
          price?: number | null
          reserved_at?: string | null
          seller_id?: string
          seller_name?: string
          sold_at?: string | null
          status?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      farmer_affiliations: {
        Args: { p_user: string }
        Returns: {
          created_at: string
          membership_id: string
          organization_name: string
        }[]
      }
      farmer_credentials: {
        Args: { p_user: string }
        Returns: {
          certificate_number: string
          created_at: string
          credential_type: string
          issuing_organization: string
        }[]
      }
      farmer_endorsements: {
        Args: { p_user: string }
        Returns: {
          created_at: string
          date_issued: string
          issuing_office: string
          municipality: string
        }[]
      }
      farmer_profile: {
        Args: { p_user: string }
        Returns: {
          avatar_path: string
          barangay: string
          created_at: string
          farm_size_hectares: number
          full_name: string
          id: string
          municipality: string
          province: string
          rating_avg: number
          rating_count: number
          rice_varieties: string[]
          rsbsa_number: string
          verification_status: string
          years_farming_experience: number
        }[]
      }
      forum_category_counts: {
        Args: never
        Returns: {
          category: string
          post_count: number
        }[]
      }
      unread_message_counts: {
        Args: never
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      user_rating: {
        Args: { p_user: string }
        Returns: {
          rating_avg: number
          rating_count: number
        }[]
      }
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
    Enums: {},
  },
} as const
