import { join } from "node:path";
import { asepriteConfig } from "./config.js";
import type { AssetPlan } from "./types.js";
import { writeJson } from "./fs-utils.js";

export function buildAsepriteCommand(plan: AssetPlan, sheetPath: string, dataPath: string): string {
  const tagArgs = plan.tags
    .map((tag, row) => {
      const from = row * plan.sheet.cols;
      const to = from + plan.sheet.cols - 1;
      return `--tag ${tag}:${from}-${to}`;
    })
    .join(" ");

  return [
    asepriteConfig.binary,
    "--batch",
    `"${sheetPath}"`,
    "--sheet-type",
    asepriteConfig.sheetType,
    "--data",
    `"${dataPath}"`,
    "--format",
    asepriteConfig.dataFormat,
    "--sheet",
    `"${sheetPath}"`,
    "--border-padding",
    String(asepriteConfig.borderPadding),
    "--shape-padding",
    String(asepriteConfig.shapePadding),
    "--extrude",
    String(asepriteConfig.extrude),
    tagArgs
  ]
    .filter(Boolean)
    .join(" ");
}

export async function writeAsepriteExportPlan(rootDir: string, plans: AssetPlan[]): Promise<string> {
  const commands = plans.map((plan) => {
    const sheetPath = join(rootDir, plan.category, `${plan.id}.png`);
    const dataPath = join(rootDir, "generated", "aseprite", `${plan.id}.json`);
    return buildAsepriteCommand(plan, sheetPath, dataPath);
  });

  const path = join(rootDir, "generated", "aseprite-export.json");
  await writeJson(path, {
    ...asepriteConfig,
    commands
  });
  return path;
}
