import { listen } from "@tauri-apps/api/event";
import type { UsagePayload } from "./types";
import { initSprite } from "./sprites";
import { createWidget } from "./widget";

window.addEventListener("DOMContentLoaded", () => {
  const spriteCanvas = document.querySelector<HTMLCanvasElement>("#sprite");
  if (spriteCanvas) initSprite(spriteCanvas);

  const widget = createWidget(document);

  listen<UsagePayload>("usage://update", (event) => widget.update(event.payload));

  setInterval(() => widget.tick(), 1000);
});
