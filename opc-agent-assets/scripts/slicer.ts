import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { AssetMetadata, AssetPlan, FrameMetadata } from "./types.js";
import { ensureDir, writeJson } from "./fs-utils.js";

export async function sliceSheet(plan: AssetPlan, sheetBuffer: Buffer, outputDir: string, metadataPath: string): Promise<AssetMetadata> {
  const png = PNG.sync.read(sheetBuffer);
  const frameWidth = Math.floor(png.width / plan.sheet.cols);
  const frameHeight = Math.floor(png.height / plan.sheet.rows);
  const frames: FrameMetadata[] = [];

  await ensureDir(outputDir);

  for (let row = 0; row < plan.sheet.rows; row += 1) {
    for (let col = 0; col < plan.sheet.cols; col += 1) {
      const frame = new PNG({ width: frameWidth, height: frameHeight, colorType: 6 });
      const x = col * frameWidth;
      const y = row * frameHeight;
      PNG.bitblt(png, frame, x, y, frameWidth, frameHeight, 0, 0);

      const filename = `${plan.id}_${String(row).padStart(2, "0")}_${String(col).padStart(2, "0")}.png`;
      await writeFile(join(outputDir, filename), PNG.sync.write(frame));
      frames.push({
        filename,
        frame: { x, y, w: frameWidth, h: frameHeight },
        tags: [plan.tags[row] || plan.tags[col] || "frame"]
      });
    }
  }

  const metadata: AssetMetadata = {
    id: plan.id,
    category: plan.category,
    kind: plan.kind,
    sheet: {
      ...plan.sheet,
      frameWidth,
      frameHeight
    },
    source: `${plan.id}.png`,
    frames
  };

  await writeJson(metadataPath, metadata);
  return metadata;
}
