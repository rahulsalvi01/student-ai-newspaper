export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SourceCategoryDb =
  | 'models_releases'
  | 'developer_tools'
  | 'research'
  | 'open_source'
  | 'industry_infrastructure'
  | 'student_action'
  | 'general_ai';

export type EditionStatus = 'building' | 'ready' | 'partial' | 'failed';
export type SummaryKind = 'source_snippet' | 'ai_generated' | 'editorial';
export type GenerationTrigger = 'scheduled' | 'manual';
export type GenerationStatus = 'running' | 'succeeded' | 'partial' | 'failed';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          timezone: string;
          language: string;
          topics: string[];
          regions: string[];
          daily_story_limit: number;
          email_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          timezone?: string;
          language?: string;
          topics?: string[];
          regions?: string[];
          daily_story_limit?: number;
          email_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          timezone?: string;
          language?: string;
          topics?: string[];
          regions?: string[];
          daily_story_limit?: number;
          email_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          id: string;
          name: string;
          feed_url: string;
          category: string;
          language: string;
          region: string | null;
          enabled: boolean;
          last_checked_at: string | null;
          last_success_at: string | null;
          last_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          feed_url: string;
          category: string;
          language?: string;
          region?: string | null;
          enabled?: boolean;
          last_checked_at?: string | null;
          last_success_at?: string | null;
          last_error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          feed_url?: string;
          category?: string;
          language?: string;
          region?: string | null;
          enabled?: boolean;
          last_checked_at?: string | null;
          last_success_at?: string | null;
          last_error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          source_id: string;
          canonical_url: string;
          title: string;
          description: string | null;
          author: string | null;
          published_at: string | null;
          fetched_at: string;
          language: string | null;
          category: string | null;
          content_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          canonical_url: string;
          title: string;
          description?: string | null;
          author?: string | null;
          published_at?: string | null;
          fetched_at?: string;
          language?: string | null;
          category?: string | null;
          content_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          canonical_url?: string;
          title?: string;
          description?: string | null;
          author?: string | null;
          published_at?: string | null;
          fetched_at?: string;
          language?: string | null;
          category?: string | null;
          content_hash?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'articles_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'sources';
            referencedColumns: ['id'];
          }
        ];
      };
      editions: {
        Row: {
          id: string;
          issue_date: string;
          timezone: string;
          status: EditionStatus;
          headline: string | null;
          generated_at: string | null;
          article_count: number;
          generation_run_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          issue_date: string;
          timezone?: string;
          status: EditionStatus;
          headline?: string | null;
          generated_at?: string | null;
          article_count?: number;
          generation_run_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          issue_date?: string;
          timezone?: string;
          status?: EditionStatus;
          headline?: string | null;
          generated_at?: string | null;
          article_count?: number;
          generation_run_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      edition_stories: {
        Row: {
          edition_id: string;
          article_id: string;
          rank: number;
          section: string;
          summary: string | null;
          summary_kind: SummaryKind;
          created_at: string;
        };
        Insert: {
          edition_id: string;
          article_id: string;
          rank: number;
          section: string;
          summary?: string | null;
          summary_kind?: SummaryKind;
          created_at?: string;
        };
        Update: {
          edition_id?: string;
          article_id?: string;
          rank?: number;
          section?: string;
          summary?: string | null;
          summary_kind?: SummaryKind;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'edition_stories_edition_id_fkey';
            columns: ['edition_id'];
            isOneToOne: false;
            referencedRelation: 'editions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'edition_stories_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'articles';
            referencedColumns: ['id'];
          }
        ];
      };
      generation_runs: {
        Row: {
          id: string;
          started_at: string;
          finished_at: string | null;
          trigger: GenerationTrigger;
          status: GenerationStatus;
          feeds_attempted: number;
          feeds_succeeded: number;
          articles_ingested: number;
          error_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          started_at?: string;
          finished_at?: string | null;
          trigger: GenerationTrigger;
          status: GenerationStatus;
          feeds_attempted?: number;
          feeds_succeeded?: number;
          articles_ingested?: number;
          error_summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          started_at?: string;
          finished_at?: string | null;
          trigger?: GenerationTrigger;
          status?: GenerationStatus;
          feeds_attempted?: number;
          feeds_succeeded?: number;
          articles_ingested?: number;
          error_summary?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      delivery_logs: {
        Row: {
          id: string;
          edition_id: string;
          channel: 'email';
          recipient_hash: string | null;
          status: DeliveryStatus;
          provider_message_id: string | null;
          error_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          channel: 'email';
          recipient_hash?: string | null;
          status: DeliveryStatus;
          provider_message_id?: string | null;
          error_summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          edition_id?: string;
          channel?: 'email';
          recipient_hash?: string | null;
          status?: DeliveryStatus;
          provider_message_id?: string | null;
          error_summary?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'delivery_logs_edition_id_fkey';
            columns: ['edition_id'];
            isOneToOne: false;
            referencedRelation: 'editions';
            referencedColumns: ['id'];
          }
        ];
      };
      subscribers: {
        Row: {
          id: string;
          email: string;
          normalized_email: string;
          status: 'active' | 'unsubscribed' | 'pending';
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          normalized_email: string;
          status?: 'active' | 'unsubscribed' | 'pending';
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          normalized_email?: string;
          status?: 'active' | 'unsubscribed' | 'pending';
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type SourceRow = Database['public']['Tables']['sources']['Row'];
export type SourceInsert = Database['public']['Tables']['sources']['Insert'];
export type SourceUpdate = Database['public']['Tables']['sources']['Update'];

export type ArticleRow = Database['public']['Tables']['articles']['Row'];
export type ArticleInsert = Database['public']['Tables']['articles']['Insert'];
export type ArticleUpdate = Database['public']['Tables']['articles']['Update'];

export type EditionRow = Database['public']['Tables']['editions']['Row'];
export type EditionInsert = Database['public']['Tables']['editions']['Insert'];
export type EditionUpdate = Database['public']['Tables']['editions']['Update'];

export type EditionStoryRow = Database['public']['Tables']['edition_stories']['Row'];
export type EditionStoryInsert = Database['public']['Tables']['edition_stories']['Insert'];
export type EditionStoryUpdate = Database['public']['Tables']['edition_stories']['Update'];

export type GenerationRunRow = Database['public']['Tables']['generation_runs']['Row'];
export type GenerationRunInsert = Database['public']['Tables']['generation_runs']['Insert'];
export type GenerationRunUpdate = Database['public']['Tables']['generation_runs']['Update'];

export type SubscriberRow = Database['public']['Tables']['subscribers']['Row'];
export type SubscriberInsert = Database['public']['Tables']['subscribers']['Insert'];
export type SubscriberUpdate = Database['public']['Tables']['subscribers']['Update'];
