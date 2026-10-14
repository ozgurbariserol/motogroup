export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      club_members: {
        Row: {
          club_id: string;
          id: string;
          joined_at: string;
          profile_id: string;
          role: string;
          status: string;
        };
        Insert: {
          club_id: string;
          id?: string;
          joined_at?: string;
          profile_id: string;
          role?: string;
          status?: string;
        };
        Update: {
          club_id?: string;
          id?: string;
          joined_at?: string;
          profile_id?: string;
          role?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'club_members_club_id_fkey';
            columns: ['club_id'];
            isOneToOne: false;
            referencedRelation: 'clubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'club_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      clubs: {
        Row: {
          capacity: number;
          city: string | null;
          created_at: string;
          description: string | null;
          id: string;
          logo_url: string | null;
          member_count: number;
          moto_type: string | null;
          name: string;
          owner_id: string;
          subscription_expires_at: string | null;
          subscription_status: string;
          subscription_tier: string | null;
        };
        Insert: {
          capacity?: number;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          member_count?: number;
          moto_type?: string | null;
          name: string;
          owner_id: string;
          subscription_expires_at?: string | null;
          subscription_status?: string;
          subscription_tier?: string | null;
        };
        Update: {
          capacity?: number;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          member_count?: number;
          moto_type?: string | null;
          name?: string;
          owner_id?: string;
          subscription_expires_at?: string | null;
          subscription_status?: string;
          subscription_tier?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'clubs_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      event_attendees: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          profile_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          profile_id: string;
          status: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          profile_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_attendees_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_attendees_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_attendees_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      event_comments: {
        Row: {
          content: string;
          created_at: string;
          event_id: string;
          id: string;
          profile_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          event_id: string;
          id?: string;
          profile_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_comments_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_comments_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_comments_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          club_id: string;
          created_at: string;
          creator_id: string;
          description: string | null;
          id: string;
          meeting_address: string | null;
          meeting_location: unknown;
          start_time: string;
          title: string;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          creator_id: string;
          description?: string | null;
          id?: string;
          meeting_address?: string | null;
          meeting_location?: unknown;
          start_time: string;
          title: string;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          id?: string;
          meeting_address?: string | null;
          meeting_location?: unknown;
          start_time?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_club_id_fkey';
            columns: ['club_id'];
            isOneToOne: false;
            referencedRelation: 'clubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          club_id: string | null;
          content: string;
          created_at: string;
          event_id: string | null;
          id: string;
          sender_id: string;
        };
        Insert: {
          club_id?: string | null;
          content: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          sender_id: string;
        };
        Update: {
          club_id?: string | null;
          content?: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_club_id_fkey';
            columns: ['club_id'];
            isOneToOne: false;
            referencedRelation: 'clubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      motorcycles: {
        Row: {
          brand: string;
          cc: number | null;
          created_at: string;
          id: string;
          is_primary: boolean;
          model: string;
          profile_id: string;
          year: number | null;
        };
        Insert: {
          brand: string;
          cc?: number | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          model: string;
          profile_id: string;
          year?: number | null;
        };
        Update: {
          brand?: string;
          cc?: number | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          model?: string;
          profile_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'motorcycles_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          city: string | null;
          created_at: string;
          display_name: string;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          city?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          city?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      route_comments: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          profile_id: string;
          route_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          profile_id: string;
          route_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          profile_id?: string;
          route_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_comments_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_comments_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_comments_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes_view';
            referencedColumns: ['id'];
          },
        ];
      };
      route_favorites: {
        Row: {
          created_at: string;
          profile_id: string;
          route_id: string;
        };
        Insert: {
          created_at?: string;
          profile_id: string;
          route_id: string;
        };
        Update: {
          created_at?: string;
          profile_id?: string;
          route_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_favorites_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_favorites_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_favorites_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes_view';
            referencedColumns: ['id'];
          },
        ];
      };
      routes: {
        Row: {
          club_id: string | null;
          created_at: string;
          creator_id: string;
          description: string | null;
          difficulty: string | null;
          distance_km: number | null;
          gpx_url: string | null;
          id: string;
          moto_type: string | null;
          start_location: unknown;
          title: string;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string;
          creator_id: string;
          description?: string | null;
          difficulty?: string | null;
          distance_km?: number | null;
          gpx_url?: string | null;
          id?: string;
          moto_type?: string | null;
          start_location?: unknown;
          title: string;
        };
        Update: {
          club_id?: string | null;
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          difficulty?: string | null;
          distance_km?: number | null;
          gpx_url?: string | null;
          id?: string;
          moto_type?: string | null;
          start_location?: unknown;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routes_club_id_fkey';
            columns: ['club_id'];
            isOneToOne: false;
            referencedRelation: 'clubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routes_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          amount: number;
          capacity: number;
          club_id: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          paytr_merchant_oid: string | null;
          period: string;
          starts_at: string | null;
          status: string;
          tier: string;
        };
        Insert: {
          amount: number;
          capacity: number;
          club_id: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          paytr_merchant_oid?: string | null;
          period: string;
          starts_at?: string | null;
          status?: string;
          tier: string;
        };
        Update: {
          amount?: number;
          capacity?: number;
          club_id?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          paytr_merchant_oid?: string | null;
          period?: string;
          starts_at?: string | null;
          status?: string;
          tier?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_club_id_fkey';
            columns: ['club_id'];
            isOneToOne: false;
            referencedRelation: 'clubs';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      events_view: {
        Row: {
          club_id: string | null;
          created_at: string | null;
          creator_id: string | null;
          description: string | null;
          id: string | null;
          meeting_address: string | null;
          meeting_lat: number | null;
          meeting_lng: number | null;
          start_time: string | null;
          title: string | null;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          id?: string | null;
          meeting_address?: string | null;
          meeting_lat?: never;
          meeting_lng?: never;
          start_time?: string | null;
          title?: string | null;
        };
        Update: {
          club_id?: string | null;
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          id?: string | null;
          meeting_address?: string | null;
          meeting_lat?: never;
          meeting_lng?: never;
          start_time?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'events_club_id_fkey';
            columns: ['club_id'];
            isOneToOne: false;
            referencedRelation: 'clubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      routes_view: {
        Row: {
          club_id: string | null;
          created_at: string | null;
          creator_id: string | null;
          description: string | null;
          difficulty: string | null;
          distance_km: number | null;
          gpx_url: string | null;
          id: string | null;
          moto_type: string | null;
          start_lat: number | null;
          start_lng: number | null;
          title: string | null;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          difficulty?: string | null;
          distance_km?: number | null;
          gpx_url?: string | null;
          id?: string | null;
          moto_type?: string | null;
          start_lat?: never;
          start_lng?: never;
          title?: string | null;
        };
        Update: {
          club_id?: string | null;
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          difficulty?: string | null;
          distance_km?: number | null;
          gpx_url?: string | null;
          id?: string | null;
          moto_type?: string | null;
          start_lat?: never;
          start_lng?: never;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routes_club_id_fkey';
            columns: ['club_id'];
            isOneToOne: false;
            referencedRelation: 'clubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routes_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      create_pending_club: {
        Args: {
          p_amount: number;
          p_capacity: number;
          p_city?: string;
          p_description?: string;
          p_logo_url?: string;
          p_merchant_oid: string;
          p_moto_type?: string;
          p_name: string;
          p_owner: string;
          p_period: string;
          p_tier: string;
        };
        Returns: string;
      };
      create_upgrade_subscription: {
        Args: {
          p_amount: number;
          p_capacity: number;
          p_club_id: string;
          p_merchant_oid: string;
          p_period: string;
          p_tier: string;
        };
        Returns: undefined;
      };
      events_nearby: {
        Args: { p_lat: number; p_lng: number; p_radius_m?: number };
        Returns: {
          club_id: string;
          created_at: string;
          creator_id: string;
          description: string;
          distance_m: number;
          id: string;
          meeting_address: string;
          meeting_lat: number;
          meeting_lng: number;
          start_time: string;
          title: string;
        }[];
      };
      is_club_admin: { Args: { _club_id: string }; Returns: boolean };
      is_club_member: { Args: { _club_id: string }; Returns: boolean };
      is_event_admin: { Args: { _event_id: string }; Returns: boolean };
      is_event_member: { Args: { _event_id: string }; Returns: boolean };
      mark_subscription_paid: {
        Args: { p_merchant_oid: string };
        Returns: string;
      };
      routes_nearby: {
        Args: { p_lat: number; p_lng: number; p_radius_m?: number };
        Returns: {
          club_id: string;
          created_at: string;
          creator_id: string;
          description: string;
          difficulty: string;
          distance_km: number;
          distance_m: number;
          gpx_url: string;
          id: string;
          moto_type: string;
          start_lat: number;
          start_lng: number;
          title: string;
        }[];
      };
      shares_active_club_with: {
        Args: { _profile_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
