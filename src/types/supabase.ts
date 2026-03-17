// Auto-generated Supabase types placeholder
// Run: npx supabase gen types typescript --local > src/types/supabase.ts
// to regenerate from your local Supabase instance.

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
      educators: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          anthropic_api_key_encrypted: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          anthropic_api_key_encrypted?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          anthropic_api_key_encrypted?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quizzes: {
        Row: {
          id: string;
          educator_id: string;
          title: string;
          source_filename: string | null;
          source_text: string | null;
          source_reference: string | null;
          pdf_storage_path: string | null;
          status: string;
          share_token: string | null;
          question_count_requested: number;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          educator_id: string;
          title: string;
          source_filename?: string | null;
          source_text?: string | null;
          source_reference?: string | null;
          pdf_storage_path?: string | null;
          status?: string;
          share_token?: string | null;
          question_count_requested?: number;
          created_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          educator_id?: string;
          title?: string;
          source_filename?: string | null;
          source_text?: string | null;
          source_reference?: string | null;
          pdf_storage_path?: string | null;
          status?: string;
          share_token?: string | null;
          question_count_requested?: number;
          created_at?: string;
          published_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quizzes_educator_id_fkey';
            columns: ['educator_id'];
            isOneToOne: false;
            referencedRelation: 'educators';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          quiz_id: string;
          position: number;
          topic: string;
          section: string | null;
          cor_loe: string | null;
          vignette: string;
          question_text: string;
          options: Json;
          correct_answer: string;
          explanation: string;
          nuggets: Json;
          organ_systems: Json;
          physician_tasks: Json;
          disciplines: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          position: number;
          topic: string;
          section?: string | null;
          cor_loe?: string | null;
          vignette: string;
          question_text: string;
          options: Json;
          correct_answer: string;
          explanation: string;
          nuggets: Json;
          organ_systems?: Json;
          physician_tasks?: Json;
          disciplines?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          position?: number;
          topic?: string;
          section?: string | null;
          cor_loe?: string | null;
          vignette?: string;
          question_text?: string;
          options?: Json;
          correct_answer?: string;
          explanation?: string;
          nuggets?: Json;
          organ_systems?: Json;
          physician_tasks?: Json;
          disciplines?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_quiz_id_fkey';
            columns: ['quiz_id'];
            isOneToOne: false;
            referencedRelation: 'quizzes';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
