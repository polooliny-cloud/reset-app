export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          created_at: string | null;
          trial_started_at: string | null;
          onboarding_completed: boolean | null;
          xp: number | null;
          level: number | null;
          victories: number | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string | null;
          trial_started_at?: string | null;
          onboarding_completed?: boolean | null;
          xp?: number | null;
          level?: number | null;
          victories?: number | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string | null;
          trial_started_at?: string | null;
          onboarding_completed?: boolean | null;
          xp?: number | null;
          level?: number | null;
          victories?: number | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
