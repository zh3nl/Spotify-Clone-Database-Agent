import { createClient } from '@supabase/supabase-js';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.\n' +
    'Required variables:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types (will be auto-generated based on your schema)
export type Database = {
  public: {
    Tables: {
      recently_played: {
        Row: {
          id: string;
          title: string;
          artist: string;
          album: string;
          image_url: string | null;
          duration: number;
          played_at: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist: string;
          album: string;
          image_url?: string | null;
          duration: number;
          played_at?: string;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist?: string;
          album?: string;
          image_url?: string | null;
          duration?: number;
          played_at?: string;
          user_id?: string | null;
          created_at?: string;
        };
      };
      made_for_you: {
        Row: {
          id: string;
          title: string;
          description: string;
          image_url: string | null;
          playlist_type: string;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          image_url?: string | null;
          playlist_type: string;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          image_url?: string | null;
          playlist_type?: string;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      popular_albums: {
        Row: {
          id: string;
          title: string;
          artist: string;
          image_url: string | null;
          release_date: string | null;
          duration: number;
          popularity_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist: string;
          image_url?: string | null;
          release_date?: string | null;
          duration: number;
          popularity_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist?: string;
          image_url?: string | null;
          release_date?: string | null;
          duration?: number;
          popularity_score?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Type aliases for common tables
export type RecentlyPlayed = Tables<'recently_played'>;
export type MadeForYou = Tables<'made_for_you'>;
export type PopularAlbum = Tables<'popular_albums'>;

// Database utility functions
export const db = {
  // Recently played functions
  recentlyPlayed: {
    async getAll(limit = 10) {
      const { data, error } = await supabase
        .from('recently_played')
        .select('*')
        .order('played_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    
    async add(track: Inserts<'recently_played'>) {
      const { data, error } = await supabase
        .from('recently_played')
        .insert(track)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async remove(id: string) {
      const { error } = await supabase
        .from('recently_played')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
  },

  // Made for you functions
  madeForYou: {
    async getAll() {
      const { data, error } = await supabase
        .from('made_for_you')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    
    async add(playlist: Inserts<'made_for_you'>) {
      const { data, error } = await supabase
        .from('made_for_you')
        .insert(playlist)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async update(id: string, updates: Updates<'made_for_you'>) {
      const { data, error } = await supabase
        .from('made_for_you')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // Popular albums functions
  popularAlbums: {
    async getAll(limit = 20) {
      const { data, error } = await supabase
        .from('popular_albums')
        .select('*')
        .order('popularity_score', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    
    async add(album: Inserts<'popular_albums'>) {
      const { data, error } = await supabase
        .from('popular_albums')
        .insert(album)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async updatePopularity(id: string, score: number) {
      const { data, error } = await supabase
        .from('popular_albums')
        .update({ popularity_score: score })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }
};

// Connection test function
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('recently_played')
      .select('count(*)')
      .limit(1);
    
    return !error;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

// Schema validation function
export async function validateSchema(): Promise<{ valid: boolean; missing: string[] }> {
  const requiredTables = ['recently_played', 'made_for_you', 'popular_albums'];
  const missing: string[] = [];
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        missing.push(table);
      }
    } catch (error) {
      missing.push(table);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
} 