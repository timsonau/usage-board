import type { Mood } from "./types";

const SEGMENTS = 10;
const GAP = 1;
const SEG_W = 5;
const LOGICAL_W = SEGMENTS * SEG_W + (SEGMENTS - 1) * GAP; // 59
const LOGICAL_H = 8;

const MOOD_COLOR: Record<Mood, string> = {
  waiting: "#6b7280",
  calm: "#7dd3a8",
  busy: "#ffd166",
  anxious: "#ff9f5b",
  critical: "#ff5c5c",
};

// Each bar colors itself off its own percentage, independent of the other
// window and independent of the character's overall (max-driven) mood — a
// calm 7d window stays green even while a hot 5h window turns the mascot
// anxious.
function moodForPct(pct: number): Mood {
  if (pct >= 100) return "critical";
  if (pct >= 85) return "anxious";
  if (pct >= 50) return "busy";
  return "calm";
}

export function initBar(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number) {
  canvas.width = LOGICAL_W;
  canvas.height = LOGICAL_H;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
}

export function drawBar(canvas: HTMLCanvasElement, pct: number | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

  const color = pct === null ? MOOD_COLOR.waiting : MOOD_COLOR[moodForPct(pct)];
  const clamped = Math.max(0, Math.min(100, pct ?? 0));
  const filled = Math.round((clamped / 100) * SEGMENTS);

  for (let i = 0; i < SEGMENTS; i++) {
    ctx.fillStyle = i < filled ? color : "rgba(255,255,255,0.14)";
    ctx.fillRect(i * (SEG_W + GAP), 0, SEG_W, LOGICAL_H);
  }
}
