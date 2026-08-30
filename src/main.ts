import { listen } from "@tauri-apps/api/event";
import type { UsagePayload } from "./types";
import { initSprite, setMood } from "./sprites";
import { initBar, drawBar } from "./bars";
import { formatCountdown } from "./countdown";

let bar5h: HTMLCanvasElement | null = null;
let bar7d: HTMLCanvasElement | null = null;
let sessionResetsAt: string | null = null;
let weeklyResetsAt: string | null = null;

function render(payload: UsagePayload) {
  setMood(payload.mood);

  const pct5hEl = document.querySelector<HTMLSpanElement>("#pct-5h");
  const pct7dEl = document.querySelector<HTMLSpanElement>("#pct-7d");
  const widget = document.querySelector<HTMLDivElement>("#widget");

  sessionResetsAt = payload.session_resets_at;
  weeklyResetsAt = payload.weekly_resets_at;
  tickCountdowns();

  if (payload.status === "waiting") {
    if (pct5hEl) pct5hEl.textContent = "--";
    if (pct7dEl) pct7dEl.textContent = "--";
    if (widget) widget.title = "waiting for claude login";
    if (bar5h) drawBar(bar5h, null);
    if (bar7d) drawBar(bar7d, null);
    return;
  }

  if (widget) widget.title = "";
  if (pct5hEl) pct5hEl.textContent = payload.session_pct !== null ? `${Math.round(payload.session_pct)}%` : "--";
  if (pct7dEl) pct7dEl.textContent = payload.weekly_pct !== null ? `${Math.round(payload.weekly_pct)}%` : "--";
  if (bar5h) drawBar(bar5h, payload.session_pct);
  if (bar7d) drawBar(bar7d, payload.weekly_pct);
}

function tickCountdowns() {
  const reset5hEl = document.querySelector<HTMLSpanElement>("#reset-5h");
  const reset7dEl = document.querySelector<HTMLSpanElement>("#reset-7d");
  if (reset5hEl) reset5hEl.textContent = formatCountdown(sessionResetsAt);
  if (reset7dEl) reset7dEl.textContent = formatCountdown(weeklyResetsAt);
}

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#sprite");
  if (canvas) initSprite(canvas);

  bar5h = document.querySelector<HTMLCanvasElement>("#bar-5h");
  bar7d = document.querySelector<HTMLCanvasElement>("#bar-7d");
  if (bar5h) initBar(bar5h, 56, 10);
  if (bar7d) initBar(bar7d, 56, 10);

  listen<UsagePayload>("usage://update", (event) => render(event.payload));

  setInterval(tickCountdowns, 1000);
});
