import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UsagePayload } from "./types";
import { initSprite } from "./sprites";
import { createWidget } from "./widget";

window.addEventListener("DOMContentLoaded", () => {
  const spriteCanvas = document.querySelector<HTMLCanvasElement>("#sprite");
  if (spriteCanvas) initSprite(spriteCanvas);

  const closeBtn = document.querySelector<HTMLButtonElement>("#close-btn");
  closeBtn?.addEventListener("click", () => getCurrentWindow().close());

  const widget = createWidget(document);

  listen<UsagePayload>("usage://update", (event) => widget.update(event.payload));

  setInterval(() => widget.tick(), 1000);
});
