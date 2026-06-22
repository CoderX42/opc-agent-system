import { PNG } from "pngjs";
import type { AssetPlan, ImageProvider, ProviderName, ProviderRequest } from "./types.js";

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class LocalPixelProvider implements ImageProvider {
  readonly name: ProviderName = "local";

  isAvailable(): boolean {
    return true;
  }

  async generate(request: ProviderRequest): Promise<Buffer> {
    return renderLocalSheet(request.plan);
  }
}

export function renderLocalSheet(plan: AssetPlan): Buffer {
  const width = plan.sheet.frameWidth * plan.sheet.cols;
  const height = plan.sheet.frameHeight * plan.sheet.rows;
  const png = new PNG({ width, height, colorType: 6 });

  clear(png);
  for (let row = 0; row < plan.sheet.rows; row += 1) {
    for (let col = 0; col < plan.sheet.cols; col += 1) {
      const x = col * plan.sheet.frameWidth;
      const y = row * plan.sheet.frameHeight;
      drawCell(png, plan, x, y, col, row);
    }
  }

  return PNG.sync.write(png);
}

function drawCell(png: PNG, plan: AssetPlan, ox: number, oy: number, col: number, row: number): void {
  if (plan.kind === "character") {
    drawCharacter(png, plan, ox, oy, col, row);
    return;
  }
  if (plan.kind === "room") {
    drawRoomTile(png, plan, ox, oy, col, row);
    return;
  }
  if (plan.kind === "furniture") {
    drawFurniture(png, plan, ox, oy, col, row);
    return;
  }
  if (plan.kind === "ui") {
    drawUiIcon(png, plan, ox, oy, col, row);
    return;
  }
  drawEffect(png, plan, ox, oy, col, row);
}

function drawCharacter(png: PNG, plan: AssetPlan, ox: number, oy: number, col: number, row: number): void {
  const [ink, dark, primary, light, skin, cream, gray, white] = plan.palette.map(hex);
  const scale = Math.max(1, Math.floor(Math.min(plan.sheet.frameWidth / 40, plan.sheet.frameHeight / 48)));
  const frameWidth = plan.sheet.frameWidth;
  const frameHeight = plan.sheet.frameHeight;
  const baseWidth = 40;
  const baseHeight = 48;
  const x0 = ox + Math.floor((frameWidth - baseWidth * scale) / 2);
  const y0 = oy + Math.floor((frameHeight - baseHeight * scale) / 2);
  const bounce = [0, 1, 0, -1, 0, 1, 0, -1][col % 8];
  const talk = plan.id.includes("customer") && col % 2 === 1;
  const work = !plan.id.includes("customer") && col % 3 === 2;
  const cx = 20;
  const top = 2 + bounce;
  const brect = (x: number, y: number, w: number, h: number, color: Rgba) => rect(png, x0 + x * scale, y0 + y * scale, w * scale, h * scale, color);
  const bsparkle = (x: number, y: number, color: Rgba) => sparkle(png, x0 + x * scale, y0 + y * scale, color, scale);
  const bline = (x1: number, y1: number, x2: number, y2: number, color: Rgba) => line(png, x0 + x1 * scale, y0 + y1 * scale, x0 + x2 * scale, y0 + y2 * scale, color);

  brect(cx - 7, top + 13, 14, 17, ink);
  brect(cx - 6, top + 14, 12, 15, primary);
  brect(cx - 4, top + 17, 8, 2, light);
  brect(cx - 9, top + 16, 3, 10, skin);
  brect(cx + 6, top + 16, 3, 10, skin);
  if (work) {
    brect(cx + 7, top + 20, 6, 5, gray);
    brect(cx + 8, top + 21, 4, 3, white);
  }

  brect(cx - 6, top + 30, 5, 9, dark);
  brect(cx + 1, top + 30, 5, 9, dark);
  brect(cx - 7 + (col % 2), top + 38, 6, 2, ink);
  brect(cx + (col % 2), top + 38, 7, 2, ink);

  brect(cx - 6, top + 2, 12, 11, skin);
  brect(cx - 7, top + 1, 14, 5, dark);
  brect(cx - 4, top + 7, 2, 2, ink);
  brect(cx + 3, top + 7, 2, 2, ink);
  brect(cx - 1, top + 10, talk ? 4 : 2, 1, ink);
  brect(cx + 6, top + 6, 2, 5, gray);
  brect(cx + 8, top + 9, 5, 1, gray);
  brect(cx + 12, top + 8, 2, 3, cream);

  if (plan.id.includes("finance")) {
    brect(cx + 9, top + 22, 6, 6, cream);
    brect(cx + 10, top + 23, 1, 1, primary);
    brect(cx + 12, top + 23, 1, 1, primary);
    brect(cx + 10, top + 25, 4, 1, primary);
    bsparkle(cx - 11, top + 26, light);
    bsparkle(cx + 16, top + 27, light);
  } else if (plan.id.includes("customer")) {
    brect(cx + 11, top + 14, 8, 5, white);
    brect(cx + 12, top + 15, 5, 1, primary);
    brect(cx + 12, top + 17, 3, 1, primary);
  } else if (plan.id.includes("legal")) {
    brect(cx + 9, top + 20, 8, 7, white);
    brect(cx + 10, top + 22, 6, 1, primary);
    bline(cx - 13, top + 18, cx - 7, top + 18, light);
    bline(cx - 10, top + 15, cx - 10, top + 23, light);
  } else {
    brect(cx + 10, top + 20, 7, 8, white);
    brect(cx + 11, top + 22, 5, 1, light);
    brect(cx + 11, top + 25, 5, 1, light);
    brect(cx - 15, top + 24, 6, 4, cream);
  }
}

function drawRoomTile(png: PNG, plan: AssetPlan, ox: number, oy: number, col: number, row: number): void {
  const [ink, dark, mid, aqua, green, tan, cream, orange] = plan.palette.map(hex);
  const variant = row * plan.sheet.cols + col;
  rect(png, ox, oy, 32, 32, transparent());

  if (variant % 8 < 3) {
    rect(png, ox + 1, oy + 17, 30, 13, tan);
    for (let i = 0; i < 32; i += 8) {
      line(png, ox + i, oy + 17, ox + i + 12, oy + 31, cream);
    }
    rect(png, ox + 1, oy + 30, 30, 1, dark);
    return;
  }

  if (variant % 8 < 5) {
    rect(png, ox + 1, oy + 2, 30, 28, dark);
    rect(png, ox + 2, oy + 3, 28, 10, mid);
    rect(png, ox + 4, oy + 5, 6, 6, aqua);
    rect(png, ox + 12, oy + 5, 6, 6, green);
    rect(png, ox + 20, oy + 5, 6, 6, orange);
    rect(png, ox + 2, oy + 22, 28, 8, tan);
    return;
  }

  if (variant % 8 < 7) {
    rect(png, ox + 2, oy + 6, 28, 20, aqua);
    rect(png, ox + 4, oy + 8, 24, 16, rgba(aqua.r, aqua.g, aqua.b, 90));
    rect(png, ox + 2, oy + 25, 28, 3, ink);
    line(png, ox + 7, oy + 7, ox + 24, oy + 23, cream);
    return;
  }

  rect(png, ox + 3, oy + 20, 26, 7, dark);
  rect(png, ox + 5, oy + 13, 22, 9, mid);
  rect(png, ox + 8, oy + 9, 16, 6, green);
  rect(png, ox + 10, oy + 11, 12, 2, cream);
}

function drawFurniture(png: PNG, plan: AssetPlan, ox: number, oy: number, col: number, row: number): void {
  const [ink, dark, gray, wood, woodLight, aqua, green, cream] = plan.palette.map(hex);
  const index = row * plan.sheet.cols + col;
  switch (index % 12) {
    case 0:
      rect(png, ox + 4, oy + 15, 24, 8, wood);
      rect(png, ox + 6, oy + 12, 20, 5, woodLight);
      rect(png, ox + 6, oy + 23, 3, 7, ink);
      rect(png, ox + 23, oy + 23, 3, 7, ink);
      break;
    case 1:
      rect(png, ox + 10, oy + 10, 12, 13, aqua);
      rect(png, ox + 9, oy + 9, 14, 2, ink);
      rect(png, ox + 13, oy + 23, 6, 4, dark);
      rect(png, ox + 9, oy + 27, 14, 2, dark);
      break;
    case 2:
      rect(png, ox + 9, oy + 14, 14, 11, gray);
      rect(png, ox + 11, oy + 11, 10, 6, gray);
      rect(png, ox + 8, oy + 24, 16, 3, ink);
      break;
    case 3:
      rect(png, ox + 8, oy + 11, 16, 16, dark);
      rect(png, ox + 10, oy + 13, 12, 3, cream);
      rect(png, ox + 10, oy + 18, 12, 3, cream);
      break;
    case 4:
      rect(png, ox + 11, oy + 9, 10, 17, green);
      rect(png, ox + 13, oy + 5, 6, 7, green);
      rect(png, ox + 10, oy + 25, 12, 4, wood);
      break;
    case 5:
      rect(png, ox + 8, oy + 15, 16, 11, cream);
      rect(png, ox + 10, oy + 11, 12, 5, aqua);
      rect(png, ox + 11, oy + 19, 10, 2, dark);
      break;
    default:
      rect(png, ox + 5, oy + 17, 22, 8, wood);
      rect(png, ox + 7, oy + 8, 18, 11, dark);
      rect(png, ox + 9, oy + 10, 14, 7, aqua);
      rect(png, ox + 13, oy + 25, 6, 4, gray);
  }
}

function drawUiIcon(png: PNG, plan: AssetPlan, ox: number, oy: number, col: number, row: number): void {
  const [ink, dark, blue, green, yellow, red, white, gray] = plan.palette.map(hex);
  const index = row * plan.sheet.cols + col;
  rect(png, ox + 1, oy + 1, 14, 14, rgba(dark.r, dark.g, dark.b, 210));
  rect(png, ox + 2, oy + 2, 12, 12, rgba(ink.r, ink.g, ink.b, 180));
  const color = [blue, green, yellow, red][index % 4];
  if (index % 8 === 0) {
    rect(png, ox + 4, oy + 4, 8, 7, color);
    rect(png, ox + 5, oy + 11, 6, 1, white);
  } else if (index % 8 === 1) {
    rect(png, ox + 5, oy + 3, 7, 10, white);
    rect(png, ox + 6, oy + 5, 5, 1, color);
    rect(png, ox + 6, oy + 8, 5, 1, color);
  } else if (index % 8 === 2) {
    rect(png, ox + 4, oy + 4, 8, 8, color);
    rect(png, ox + 6, oy + 6, 4, 4, ink);
  } else if (index % 8 === 3) {
    rect(png, ox + 3, oy + 5, 10, 6, color);
    rect(png, ox + 5, oy + 4, 6, 2, color);
  } else if (index % 8 === 4) {
    rect(png, ox + 7, oy + 3, 2, 10, color);
    rect(png, ox + 4, oy + 6, 8, 2, color);
  } else if (index % 8 === 5) {
    rect(png, ox + 4, oy + 4, 8, 8, gray);
    rect(png, ox + 6, oy + 6, 4, 4, color);
  } else if (index % 8 === 6) {
    rect(png, ox + 4, oy + 4, 8, 8, red);
    rect(png, ox + 7, oy + 5, 2, 5, white);
    rect(png, ox + 7, oy + 11, 2, 1, white);
  } else {
    sparkle(png, ox + 8, oy + 8, color);
  }
}

function drawEffect(png: PNG, plan: AssetPlan, ox: number, oy: number, col: number, row: number): void {
  const [, dark, blue, green, yellow, orange, white, gray] = plan.palette.map(hex);
  const index = row * plan.sheet.cols + col;
  const cx = ox + 16;
  const cy = oy + 16;
  if (index % 6 === 0) {
    for (let i = 0; i <= col + 1; i += 1) {
      rect(png, cx - 9 + i * 5, cy - 5 - (i % 2), 3, 3, blue);
    }
  } else if (index % 6 === 1) {
    rect(png, cx - 10, cy + 4, 20, 3, gray);
    rect(png, cx - 8, cy + 1, 4 + col * 2, 2, green);
  } else if (index % 6 === 2) {
    line(png, cx - 7, cy, cx, cy - 7, blue);
    line(png, cx, cy - 7, cx + 7, cy, blue);
    line(png, cx + 7, cy, cx, cy + 7, blue);
    line(png, cx, cy + 7, cx - 7, cy, blue);
    rect(png, cx - 2, cy - 2, 4, 4, white);
  } else if (index % 6 === 3) {
    rect(png, cx - 8, cy - 1, 5, 5, green);
    rect(png, cx - 3, cy + 3, 4, 4, green);
    rect(png, cx + 1, cy - 7, 5, 14, green);
  } else if (index % 6 === 4) {
    rect(png, cx - 8, cy - 8, 16, 16, rgba(orange.r, orange.g, orange.b, 110));
    rect(png, cx - 1, cy - 5, 2, 8, yellow);
    rect(png, cx - 1, cy + 5, 2, 2, white);
  } else {
    sparkle(png, cx, cy, yellow);
    sparkle(png, cx - 8, cy + 4, white);
    sparkle(png, cx + 8, cy - 5, green);
  }
  rect(png, cx - 10, cy + 11, 20, 1, rgba(dark.r, dark.g, dark.b, 80));
}

function clear(png: PNG): void {
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 0;
  }
}

function rect(png: PNG, x: number, y: number, w: number, h: number, color: Rgba): void {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      setPixel(png, px, py, color);
    }
  }
}

function line(png: PNG, x0: number, y0: number, x1: number, y1: number, color: Rgba): void {
  let dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;

  while (true) {
    setPixel(png, x, y, color);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function sparkle(png: PNG, x: number, y: number, color: Rgba, scale = 1): void {
  rect(png, x, y - 3 * scale, scale, 7 * scale, color);
  rect(png, x - 3 * scale, y, 7 * scale, scale, color);
  rect(png, x - scale, y - scale, scale, scale, color);
  rect(png, x + scale, y + scale, scale, scale, color);
}

function setPixel(png: PNG, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return;
  }
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color.r;
  png.data[idx + 1] = color.g;
  png.data[idx + 2] = color.b;
  png.data[idx + 3] = color.a;
}

function hex(value: string): Rgba {
  const clean = value.replace("#", "");
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
    a: 255
  };
}

function rgba(r: number, g: number, b: number, a: number): Rgba {
  return { r, g, b, a };
}

function transparent(): Rgba {
  return { r: 0, g: 0, b: 0, a: 0 };
}
