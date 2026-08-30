import type { Mood } from "./types";

// "Nibble" — cat-like mascot. Ears perk and the tail swings faster as usage
// climbs toward the anxious/critical tiers.
const GRID = 28;
const DISPLAY_PX = 58;

interface TierPalette {
  body: string;
  shade: string;
  outline: string;
  face: string;
}

const PALETTES: Record<Mood, TierPalette> = {
  waiting: { body: "#6b7280", shade: "#52575f", outline: "#3a3f47", face: "#e7e9ee" },
  calm: { body: "#7dd3a8", shade: "#54b183", outline: "#2f7d57", face: "#123321" },
  busy: { body: "#ffd166", shade: "#eab13f", outline: "#a97a1d", face: "#4a3505" },
  anxious: { body: "#ff9f5b", shade: "#e87c33", outline: "#a8501a", face: "#4a2306" },
  critical: { body: "#ff5c5c", shade: "#e63333", outline: "#a01f1f", face: "#4a0d0d" },
};

type Point = [number, number];

const MOUTHS: Record<Mood, Point[]> = {
  waiting: [
    [13, 17],
    [14, 17],
  ],
  calm: [
    [11, 17],
    [12, 18],
    [13, 18],
    [14, 18],
    [15, 18],
    [16, 17],
  ],
  busy: [
    [12, 17],
    [13, 17],
    [14, 17],
    [15, 17],
  ],
  anxious: [
    [13, 17],
    [14, 17],
    [13, 18],
    [14, 18],
  ],
  critical: [
    [12, 16],
    [13, 16],
    [14, 16],
    [15, 16],
    [12, 17],
    [13, 17],
    [14, 17],
    [15, 17],
    [12, 18],
    [13, 18],
    [14, 18],
    [15, 18],
  ],
};

function isAlert(mood: Mood): boolean {
  return mood === "anxious" || mood === "critical";
}

function ellipse(cx: number, cy: number, rx: number, ry: number) {
  return (x: number, y: number) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  };
}

function fillMask(
  ctx: CanvasRenderingContext2D,
  mask: (x: number, y: number) => boolean,
  pal: TierPalette,
) {
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!mask(x, y)) continue;
      const edge = !mask(x - 1, y) || !mask(x + 1, y) || !mask(x, y - 1) || !mask(x, y + 1);
      const lower = y > GRID * 0.6;
      ctx.fillStyle = edge ? pal.outline : lower ? pal.shade : pal.body;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

let ctx: CanvasRenderingContext2D | null = null;
let currentMood: Mood = "waiting";
let blinking = false;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let t = 0;

export function initSprite(canvasEl: HTMLCanvasElement) {
  canvasEl.width = GRID;
  canvasEl.height = GRID;
  canvasEl.style.width = `${DISPLAY_PX}px`;
  canvasEl.style.height = `${DISPLAY_PX}px`;
  ctx = canvasEl.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;

  scheduleBlink();
  requestAnimationFrame(loop);
}

export function setMood(mood: Mood) {
  currentMood = mood;
}

function scheduleBlink() {
  const delay = 2800 + Math.random() * 2200;
  blinkTimer = setTimeout(() => {
    blinking = true;
    blinkTimer = setTimeout(() => {
      blinking = false;
      scheduleBlink();
    }, 130);
  }, delay);
}

function loop() {
  t++;
  draw();
  requestAnimationFrame(loop);
}

function draw() {
  if (!ctx) return;
  const pal = PALETTES[currentMood];
  const alert = isAlert(currentMood);
  const bob = Math.sin(t / 22) * 0.6;

  ctx.clearRect(0, 0, GRID, GRID);

  const body = ellipse(14, 17 + bob, 8.5, 8.5);
  fillMask(ctx, body, pal);

  // ears: perk up (shift up 1px) when alert, relaxed otherwise
  const earY = alert ? -1 : 0;
  ctx.fillStyle = pal.body;
  for (const [x, y] of [
    [8, 8 + bob + earY],
    [9, 7 + bob + earY],
    [9, 8 + bob + earY],
    [10, 9 + bob],
  ] as Point[]) {
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  for (const [x, y] of [
    [20, 8 + bob + earY],
    [19, 7 + bob + earY],
    [19, 8 + bob + earY],
    [18, 9 + bob],
  ] as Point[]) {
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  // whiskers
  ctx.fillStyle = pal.face;
  ctx.fillRect(7, 18 + bob, 4, 1);
  ctx.fillRect(17, 18 + bob, 4, 1);

  // tail: swings faster and wider when alert
  const tailSwing = Math.sin(t / 11) * (alert ? 3 : 1);
  ctx.fillStyle = pal.body;
  for (let i = 0; i < 7; i++) {
    const tx = 21 + i * 0.7;
    const ty = 22 + bob - i * 0.6 + Math.sin(i * 0.8 + t / 9) * tailSwing * 0.3;
    ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1);
  }

  // eyes
  const eyeY = Math.round(15 + bob);
  ctx.fillStyle = pal.face;
  if (blinking || currentMood === "waiting") {
    ctx.fillRect(11, eyeY + 1, 2, 1);
    ctx.fillRect(16, eyeY + 1, 2, 1);
  } else {
    ctx.fillRect(11, eyeY, 2, 2);
    ctx.fillRect(16, eyeY, 2, 2);
  }

  // mouth
  for (const [mx, my] of MOUTHS[currentMood]) {
    ctx.fillRect(mx, my, 1, 1);
  }
}

export function stopSprite() {
  if (blinkTimer) clearTimeout(blinkTimer);
}
