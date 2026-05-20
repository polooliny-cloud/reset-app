export type VictoryTriggerDb =
  | "onboarding_complete"
  | "first_day_clean"
  | "relapse_resisted"
  | "daily_checkin"
  | "manual";

export type SubscriptionStatusDb = "active" | "expired" | "cancelled" | "trialing";

export type SubscriptionPlanDb = "monthly" | "yearly" | "lifetime" | "free_trial";

export type PaymentStatusDb = "pending" | "paid" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          created_at: string | null;
          updated_at: string | null;
          trial_started_at: string | null;
          premium_until: string | null;
          onboarding_completed: boolean | null;
          xp: number | null;
          level: number | null;
          victories: number | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          trial_started_at?: string | null;
          premium_until?: string | null;
          onboarding_completed?: boolean | null;
          xp?: number | null;
          level?: number | null;
          victories?: number | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          trial_started_at?: string | null;
          premium_until?: string | null;
          onboarding_completed?: boolean | null;
          xp?: number | null;
          level?: number | null;
          victories?: number | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          plan: string;
          status: string;
          started_at: string;
          expires_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: string;
          plan: string;
          status: string;
          started_at?: string;
          expires_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          plan?: string;
          status?: string;
          started_at?: string;
          expires_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_invoice_id: string;
          amount: number;
          currency: string;
          status: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: string;
          provider_invoice_id: string;
          amount: number;
          currency?: string;
          status: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          provider_invoice_id?: string;
          amount?: number;
          currency?: string;
          status?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      victories: {
        Row: {
          id: string;
          user_id: string;
          trigger: VictoryTriggerDb;
          xp: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trigger: VictoryTriggerDb;
          xp: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trigger?: VictoryTriggerDb;
          xp?: number;
          created_at?: string;
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
