// Database schema types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
          name: string | null;
          avatar_url: string | null;
          subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
          subscription_tier: 'free' | 'pro' | 'enterprise' | null;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
          updated_at?: string;
          name?: string | null;
          avatar_url?: string | null;
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
          subscription_tier?: 'free' | 'pro' | 'enterprise' | null;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
          name?: string | null;
          avatar_url?: string | null;
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
          subscription_tier?: 'free' | 'pro' | 'enterprise' | null;
        };
      };
      projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          user_id: string;
          is_public: boolean;
          thumbnail_url: string | null;
          last_accessed: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          description?: string | null;
          user_id: string;
          is_public?: boolean;
          thumbnail_url?: string | null;
          last_accessed?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          description?: string | null;
          user_id?: string;
          is_public?: boolean;
          thumbnail_url?: string | null;
          last_accessed?: string | null;
        };
      };
      components: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          code: string;
          project_id: string;
          type: 'ui' | 'layout' | 'animation' | 'utility';
          tags: string[] | null;
          is_favorite: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          description?: string | null;
          code: string;
          project_id: string;
          type?: 'ui' | 'layout' | 'animation' | 'utility';
          tags?: string[] | null;
          is_favorite?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          description?: string | null;
          code?: string;
          project_id?: string;
          type?: 'ui' | 'layout' | 'animation' | 'utility';
          tags?: string[] | null;
          is_favorite?: boolean;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
          tier: 'free' | 'pro' | 'enterprise';
          created_at: string;
          updated_at: string;
          current_period_end: string | null;
          cancel_at: string | null;
          canceled_at: string | null;
          trial_end: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
          tier: 'free' | 'pro' | 'enterprise';
          created_at?: string;
          updated_at?: string;
          current_period_end?: string | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          trial_end?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
          tier?: 'free' | 'pro' | 'enterprise';
          created_at?: string;
          updated_at?: string;
          current_period_end?: string | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          trial_end?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        };
      };
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          action: 'create_project' | 'create_component' | 'export_code' | 'api_request';
          created_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: 'create_project' | 'create_component' | 'export_code' | 'api_request';
          created_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: 'create_project' | 'create_component' | 'export_code' | 'api_request';
          created_at?: string;
          metadata?: Json | null;
        };
      };
      shared_components: {
        Row: {
          id: string;
          component_id: string;
          shared_by: string;
          shared_with: string | null;
          access_level: 'view' | 'edit' | 'admin';
          created_at: string;
          updated_at: string;
          share_link: string | null;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          component_id: string;
          shared_by: string;
          shared_with?: string | null;
          access_level: 'view' | 'edit' | 'admin';
          created_at?: string;
          updated_at?: string;
          share_link?: string | null;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          component_id?: string;
          shared_by?: string;
          shared_with?: string | null;
          access_level?: 'view' | 'edit' | 'admin';
          created_at?: string;
          updated_at?: string;
          share_link?: string | null;
          is_public?: boolean;
        };
      };
    };
    Views: {
      user_projects_summary: {
        Row: {
          user_id: string;
          total_projects: number;
          total_components: number;
          last_project_date: string | null;
        };
      };
    };
    Functions: {
      get_user_usage: {
        Args: { user_id: string };
        Returns: {
          action: string;
          count: number;
        }[];
      };
    };
    Enums: {
      subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
      subscription_tier: 'free' | 'pro' | 'enterprise';
      component_type: 'ui' | 'layout' | 'animation' | 'utility';
      access_level: 'view' | 'edit' | 'admin';
    };
  };
}

// API response types
export type ApiResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: {
    message: string;
    status: number;
  };
};

export type UserResponse = ApiResponse<Database['public']['Tables']['users']['Row']>;
export type ProjectResponse = ApiResponse<Database['public']['Tables']['projects']['Row']>;
export type ComponentResponse = ApiResponse<Database['public']['Tables']['components']['Row']>;
export type SubscriptionResponse = ApiResponse<Database['public']['Tables']['subscriptions']['Row']>;

export type ProjectsListResponse = ApiResponse<Database['public']['Tables']['projects']['Row'][]>;
export type ComponentsListResponse = ApiResponse<Database['public']['Tables']['components']['Row'][]>;
export type UsageResponse = ApiResponse<{
  action: string;
  count: number;
}[]>;

// Utility types
export type UserWithSubscription = Database['public']['Tables']['users']['Row'] & {
  subscription?: Database['public']['Tables']['subscriptions']['Row'];
};

export type ProjectWithComponents = Database['public']['Tables']['projects']['Row'] & {
  components: Database['public']['Tables']['components']['Row'][];
};

export type ComponentWithSharing = Database['public']['Tables']['components']['Row'] & {
  shared_with: Database['public']['Tables']['shared_components']['Row'][];
};