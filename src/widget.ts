import type { UsagePayload, Mood } from "./types";
import { setMood } from "./sprites";
import { initBar, drawBar, type BarData } from "./bars";
import { formatCountdown } from "./countdown";

export interface Widget {
  update(payload: UsagePayload): void;
  tick(): void;
}

function barData(pct: number | null, mood: Mood | null): BarData | null {
  return pct !== null && mood !== null ? { pct, mood } : null;
}

// Owns the widget's DOM refs and the reset timestamps the countdowns tick
// against, so the two independent callers (a Tauri event listener and a 1s
// interval) share state through this interface instead of module-level
// variables neither of them fully owns.
export function createWidget(root: ParentNode): Widget {
  const pct5hEl = root.querySelector<HTMLSpanElement>("#pct-5h");
  const pct7dEl = root.querySelector<HTMLSpanElement>("#pct-7d");
  const reset5hEl = root.querySelector<HTMLSpanElement>("#reset-5h");
  const reset7dEl = root.querySelector<HTMLSpanElement>("#reset-7d");
  const widgetEl = root.querySelector<HTMLDivElement>("#widget");
  const bar5h = root.querySelector<HTMLCanvasElement>("#bar-5h");
  const bar7d = root.querySelector<HTMLCanvasElement>("#bar-7d");

  if (bar5h) initBar(bar5h, 56, 10);
  if (bar7d) initBar(bar7d, 56, 10);

  let sessionResetsAt: string | null = null;
  let weeklyResetsAt: string | null = null;

  function tick() {
    if (reset5hEl) reset5hEl.textContent = formatCountdown(sessionResetsAt);
    if (reset7dEl) reset7dEl.textContent = formatCountdown(weeklyResetsAt);
  }

  function update(payload: UsagePayload) {
    setMood(payload.mood);
    sessionResetsAt = payload.session_resets_at;
    weeklyResetsAt = payload.weekly_resets_at;
    tick();

    if (payload.status === "waiting") {
      if (pct5hEl) pct5hEl.textContent = "--";
      if (pct7dEl) pct7dEl.textContent = "--";
      if (widgetEl) widgetEl.title = "waiting for claude login";
      if (bar5h) drawBar(bar5h, null);
      if (bar7d) drawBar(bar7d, null);
      return;
    }

    if (widgetEl) widgetEl.title = "";
    if (pct5hEl) pct5hEl.textContent = payload.session_pct !== null ? `${Math.round(payload.session_pct)}%` : "--";
    if (pct7dEl) pct7dEl.textContent = payload.weekly_pct !== null ? `${Math.round(payload.weekly_pct)}%` : "--";
    if (bar5h) drawBar(bar5h, barData(payload.session_pct, payload.session_mood));
    if (bar7d) drawBar(bar7d, barData(payload.weekly_pct, payload.weekly_mood));
  }

  return { update, tick };
}
