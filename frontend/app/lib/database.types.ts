export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      authors: {
        Row: {
          id: string;
          pen_name: string;
          bio: string | null;
          avatar_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          pen_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          pen_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
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
        Relationships: [
          {
            foreignKeyName: "chapters_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      chapter_chunks: {
        Row: {
          id: string;
          novel_id: string;
          chapter_id: string;
          chunk_index: number;
          content: string;
          embedding: unknown;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          novel_id: string;
          chapter_id: string;
          chunk_index: number;
          content: string;
          embedding: unknown;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          novel_id?: string;
          chapter_id?: string;
          chunk_index?: number;
          content?: string;
          embedding?: unknown;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_chunks_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_chunks_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_tokens: {
        Row: {
          id: string;
          author_id: string;
          name: string;
          token_hash: string;
          hash_version: string;
          token_prefix: string;
          created_at: string | null;
          expires_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
          rotated_from_token_id: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          name?: string;
          token_hash: string;
          hash_version?: string;
          token_prefix: string;
          created_at?: string | null;
          expires_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          rotated_from_token_id?: string | null;
        };
        Update: {
          id?: string;
          author_id?: string;
          name?: string;
          token_hash?: string;
          hash_version?: string;
          token_prefix?: string;
          created_at?: string | null;
          expires_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          rotated_from_token_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_tokens_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "authors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mcp_tokens_rotated_from_token_id_fkey";
            columns: ["rotated_from_token_id"];
            isOneToOne: false;
            referencedRelation: "mcp_tokens";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_token_audit_logs: {
        Row: {
          id: string;
          token_id: string | null;
          author_id: string;
          event_type: string;
          novel_id: string | null;
          tool_name: string | null;
          request_origin: string | null;
          user_agent: string | null;
          ip_hash: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          token_id?: string | null;
          author_id: string;
          event_type: string;
          novel_id?: string | null;
          tool_name?: string | null;
          request_origin?: string | null;
          user_agent?: string | null;
          ip_hash?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          token_id?: string | null;
          author_id?: string;
          event_type?: string;
          novel_id?: string | null;
          tool_name?: string | null;
          request_origin?: string | null;
          user_agent?: string | null;
          ip_hash?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_token_audit_logs_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "authors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mcp_token_audit_logs_token_id_fkey";
            columns: ["token_id"];
            isOneToOne: false;
            referencedRelation: "mcp_tokens";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_token_rate_limits: {
        Row: {
          token_id: string;
          window_start: string;
          request_count: number;
          updated_at: string;
        };
        Insert: {
          token_id: string;
          window_start: string;
          request_count?: number;
          updated_at?: string;
        };
        Update: {
          token_id?: string;
          window_start?: string;
          request_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_token_rate_limits_token_id_fkey";
            columns: ["token_id"];
            isOneToOne: true;
            referencedRelation: "mcp_tokens";
            referencedColumns: ["id"];
          },
        ];
      };
      novels: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          description: string | null;
          cover_url: string | null;
          status: string | null;
          genre: string[] | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description?: string | null;
          cover_url?: string | null;
          status?: string | null;
          genre?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          description?: string | null;
          cover_url?: string | null;
          status?: string | null;
          genre?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "novels_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "authors";
            referencedColumns: ["id"];
          },
        ];
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
      consume_mcp_token_rate_limit: {
        Args: {
          p_token_id: string;
          p_window_start: string;
          p_window_seconds: number;
          p_max_requests: number;
        };
        Returns: {
          allowed: boolean;
          request_count: number;
          reset_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
