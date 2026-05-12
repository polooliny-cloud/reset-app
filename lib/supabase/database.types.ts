export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          trial_started_at: string | null;
          onboarding_completed: boolean | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          trial_started_at?: string | null;
          onboarding_completed?: boolean | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          trial_started_at?: string | null;
          onboarding_completed?: boolean | null;
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
