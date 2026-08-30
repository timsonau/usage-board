export type UiStatus = "waiting" | "ok";
export type Mood = "waiting" | "calm" | "busy" | "anxious" | "critical";

export interface UsagePayload {
  status: UiStatus;
  mood: Mood;
  session_pct: number | null;
  weekly_pct: number | null;
  session_mood: Mood | null;
  weekly_mood: Mood | null;
  session_resets_at: string | null;
  weekly_resets_at: string | null;
  last_updated: string;
}
