export type Database = {
  public: {
    Tables: {
      chapters: {
        Row: {
          id: string;
          novel_id: string;
          chapter_number: number;
          title: string;
          content: string;
          is_published: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          embedding: unknown | null;
        };
        Insert: {
          id?: string;
          novel_id: string;
          chapter_number: number;
          title: string;
          content: string;
          is_published?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          embedding?: unknown | null;
        };
        Update: {
          id?: string;
          novel_id?: string;
          chapter_number?: number;
          title?: string;
          content?: string;
          is_published?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          embedding?: unknown | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          plan: "normal" | "premium";
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          plan?: "normal" | "premium";
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          plan?: "normal" | "premium";
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      hybrid_search_chapters: {
        Args: {
          query_text: string;
          query_embedding: number[];
          match_count: number;
          search_novel_id: string;
          accessible_chapter_count?: number | null;
        };
        Returns: {
          id: string;
          title: string;
          content: string;
          rrf_score: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
